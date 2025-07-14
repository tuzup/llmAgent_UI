const mysql = require('mysql2');

class QueryBuilder {
    constructor() {
        this.errors = [];
        this.validOperators = ['=', '!=', '<', '>', '<=', '>=', 'LIKE', 'IN', 'NOT IN', 'BETWEEN', 'IS NULL', 'IS NOT NULL'];
        this.validJoinTypes = ['INNER', 'LEFT', 'RIGHT', 'FULL'];
        this.validAggregations = ['SUM', 'COUNT', 'AVG', 'MAX', 'MIN'];
        this.validLogic = ['AND', 'OR'];
        this.validDirections = ['ASC', 'DESC'];
    }

    // Main conversion function
    convertToMySQL(jsonQuery) {
        this.errors = [];

        try {
            // Validate query structure
            if (!this.validateQueryStructure(jsonQuery)) {
                return { query: null, errors: this.errors };
            }

            // Build the query
            let query = this.buildSelectClause(jsonQuery.select);
            query += this.buildFromClause(jsonQuery.from);

            if (jsonQuery.where) {
                query += this.buildWhereClause(jsonQuery.where);
            }

            if (jsonQuery.group_by && jsonQuery.group_by.length > 0) {
                query += this.buildGroupByClause(jsonQuery.group_by);
            }

            if (jsonQuery.having) {
                query += this.buildHavingClause(jsonQuery.having);
            }

            if (jsonQuery.order_by && jsonQuery.order_by.length > 0) {
                query += this.buildOrderByClause(jsonQuery.order_by);
            }

            if (jsonQuery.limit) {
                query += this.buildLimitClause(jsonQuery.limit);
            }

            return {
                query: query.trim(),
                errors: this.errors.length > 0 ? this.errors : null
            };
        } catch (error) {
            this.errors.push({ code: 'CONVERSION_ERROR', message: error.message });
            return { query: null, errors: this.errors };
        }
    }

    // Validate overall query structure
    validateQueryStructure(jsonQuery) {
        if (!jsonQuery || typeof jsonQuery !== 'object') {
            this.errors.push({ code: 'INVALID_QUERY', message: 'Query must be a valid object' });
            return false;
        }

        if (jsonQuery.query_type !== 'SELECT') {
            this.errors.push({ code: 'UNSUPPORTED_QUERY_TYPE', message: 'Only SELECT queries are supported' });
            return false;
        }

        if (!jsonQuery.select || !jsonQuery.from) {
            this.errors.push({ code: 'MISSING_REQUIRED_FIELDS', message: 'SELECT and FROM clauses are required' });
            return false;
        }

        return true;
    }

    // Build SELECT clause
    buildSelectClause(selectObj) {
        if (!selectObj.fields || !Array.isArray(selectObj.fields) || selectObj.fields.length === 0) {
            this.errors.push({ code: 'EMPTY_SELECT', message: 'SELECT fields cannot be empty' });
            return 'SELECT * ';
        }

        const fields = selectObj.fields.map(field => {
            if (!this.validateField(field)) {
                return null;
            }

            let fieldStr = '';

            // Add aggregation if present
            if (field.aggregation) {
                if (!this.validAggregations.includes(field.aggregation.toUpperCase())) {
                    this.errors.push({ code: 'INVALID_AGGREGATION', message: `Invalid aggregation: ${field.aggregation}` });
                    return null;
                }
                fieldStr = `${field.aggregation.toUpperCase()}(${this.escapeIdentifier(field.table)}.${this.escapeIdentifier(field.column)})`;
            } else {
                fieldStr = `${this.escapeIdentifier(field.table)}.${this.escapeIdentifier(field.column)}`;
            }

            // Add alias if present
            if (field.alias) {
                fieldStr += ` AS ${this.escapeIdentifier(field.alias)}`;
            }

            return fieldStr;
        }).filter(field => field !== null);

        if (fields.length === 0) {
            this.errors.push({ code: 'NO_VALID_FIELDS', message: 'No valid fields found in SELECT clause' });
            return 'SELECT * ';
        }

        const distinct = selectObj.distinct ? 'DISTINCT ' : '';
        return `SELECT ${distinct}${fields.join(', ')} `;
    }

    // Build FROM clause with JOINs
    buildFromClause(fromObj) {
        if (!fromObj.primary_table) {
            this.errors.push({ code: 'MISSING_PRIMARY_TABLE', message: 'Primary table is required' });
            return 'FROM ';
        }

        let fromClause = `FROM ${this.escapeIdentifier(fromObj.primary_table)} `;

        // Add JOINs
        if (fromObj.joins && Array.isArray(fromObj.joins)) {
            fromObj.joins.forEach(join => {
                if (!this.validateJoin(join)) {
                    return;
                }

                const joinType = join.type.toUpperCase();
                const joinTable = this.escapeIdentifier(join.table);
                const leftTable = this.escapeIdentifier(join.on.left.table);
                const leftColumn = this.escapeIdentifier(join.on.left.column);
                const rightTable = this.escapeIdentifier(join.on.right.table);
                const rightColumn = this.escapeIdentifier(join.on.right.column);
                const operator = join.on.operator;

                fromClause += `${joinType} JOIN ${joinTable} ON ${leftTable}.${leftColumn} ${operator} ${rightTable}.${rightColumn} `;
            });
        }

        return fromClause;
    }

    // Build WHERE clause
    buildWhereClause(whereObj) {
        if (!whereObj.conditions || !Array.isArray(whereObj.conditions)) {
            return '';
        }

        const conditions = this.buildConditions(whereObj.conditions, whereObj.mainLogic || 'AND');
        return conditions ? `WHERE ${conditions} ` : '';
    }

    // Build GROUP BY clause
    buildGroupByClause(groupByFields) {
        const fields = groupByFields.map(field => {
            if (!this.validateTableColumn(field)) {
                return null;
            }
            return `${this.escapeIdentifier(field.table)}.${this.escapeIdentifier(field.column)}`;
        }).filter(field => field !== null);

        return fields.length > 0 ? `GROUP BY ${fields.join(', ')} ` : '';
    }

    // Build HAVING clause
    buildHavingClause(havingObj) {
        if (!havingObj.conditions || !Array.isArray(havingObj.conditions)) {
            return '';
        }

        const conditions = this.buildConditions(havingObj.conditions, havingObj.logic || 'AND');
        return conditions ? `HAVING ${conditions} ` : '';
    }

    // Build ORDER BY clause
    buildOrderByClause(orderByFields) {
        const fields = orderByFields.map(field => {
            if (!this.validateOrderByField(field)) {
                return null;
            }

            let fieldStr = '';
            if (field.field.aggregation) {
                fieldStr = `${field.field.aggregation.toUpperCase()}(${this.escapeIdentifier(field.field.table)}.${this.escapeIdentifier(field.field.column)})`;
            } else {
                fieldStr = `${this.escapeIdentifier(field.field.table)}.${this.escapeIdentifier(field.field.column)}`;
            }

            fieldStr += ` ${field.direction.toUpperCase()}`;
            return fieldStr;
        }).filter(field => field !== null);

        return fields.length > 0 ? `ORDER BY ${fields.join(', ')} ` : '';
    }

    // Build LIMIT clause
    buildLimitClause(limitObj) {
        if (!limitObj.count || typeof limitObj.count !== 'number' || limitObj.count <= 0) {
            this.errors.push({ code: 'INVALID_LIMIT', message: 'Limit count must be a positive number' });
            return '';
        }

        let limitClause = `LIMIT ${limitObj.count}`;

        if (limitObj.offset && typeof limitObj.offset === 'number' && limitObj.offset > 0) {
            limitClause += ` OFFSET ${limitObj.offset}`;
        }

        return limitClause + ' ';
    }

    // Build conditions recursively
    buildConditions(conditions, mainLogic) {
        if (!conditions || conditions.length === 0) {
            return '';
        }

        const conditionStrings = conditions.map(condition => {
            if (condition.conditionGroup && Array.isArray(condition.conditionGroup)) {
                const groupConditions = condition.conditionGroup.map(cond => {
                    return this.buildSingleCondition(cond);
                }).filter(cond => cond !== null);

                if (groupConditions.length === 0) {
                    return null;
                }

                const logic = condition.logic || 'AND';
                return `(${groupConditions.join(` ${logic} `)})`;
            }
            return null;
        }).filter(cond => cond !== null);

        return conditionStrings.length > 0 ? conditionStrings.join(` ${mainLogic} `) : '';
    }

    // Build single condition
    buildSingleCondition(condition) {
        if (!this.validateCondition(condition)) {
            return null;
        }

        const field = `${this.escapeIdentifier(condition.field.table)}.${this.escapeIdentifier(condition.field.column)}`;
        const operator = condition.operator.toUpperCase();

        // Handle different operators
        switch (operator) {
            case 'IS NULL':
            case 'IS NOT NULL':
                return `${field} ${operator}`;

            case 'IN':
            case 'NOT IN':
                if (!Array.isArray(condition.value)) {
                    this.errors.push({ code: 'INVALID_IN_VALUE', message: 'IN/NOT IN requires array value' });
                    return null;
                }
                const values = condition.value.map(val => this.escapeValue(val)).join(', ');
                return `${field} ${operator} (${values})`;

            case 'BETWEEN':
                if (!Array.isArray(condition.value) || condition.value.length !== 2) {
                    this.errors.push({ code: 'INVALID_BETWEEN_VALUE', message: 'BETWEEN requires array with exactly 2 values' });
                    return null;
                }
                return `${field} BETWEEN ${this.escapeValue(condition.value[0])} AND ${this.escapeValue(condition.value[1])}`;

            default:
                // Handle column reference vs literal value
                if (condition.value_type === 'column_reference') {
                    return `${field} ${operator} ${this.buildColumnReference(condition.value)}`;
                } else {
                    return `${field} ${operator} ${this.escapeValue(condition.value)}`;
                }
        }
    }

    // Build column reference for comparisons
    buildColumnReference(columnRef) {
        if (typeof columnRef === 'object' && columnRef.table && columnRef.column) {
            // Handle object format: { table: "table_name", column: "column_name" }
            return `${this.escapeIdentifier(columnRef.table)}.${this.escapeIdentifier(columnRef.column)}`;
        } else if (typeof columnRef === 'string' && columnRef.includes('.')) {
            // Handle string format: "table_name.column_name"
            const parts = columnRef.split('.');
            if (parts.length === 2) {
                return `${this.escapeIdentifier(parts[0])}.${this.escapeIdentifier(parts[1])}`;
            }
        }

        this.errors.push({ code: 'INVALID_COLUMN_REFERENCE', message: 'Invalid column reference format' });
        return 'NULL';
    }

    // Validation functions
    validateField(field) {
        if (!field || typeof field !== 'object') {
            this.errors.push({ code: 'INVALID_FIELD', message: 'Field must be an object' });
            return false;
        }

        if (!field.table || !field.column) {
            this.errors.push({ code: 'MISSING_FIELD_INFO', message: 'Field must have table and column' });
            return false;
        }

        return true;
    }

    validateTableColumn(field) {
        if (!field || !field.table || !field.column) {
            this.errors.push({ code: 'INVALID_TABLE_COLUMN', message: 'Table and column are required' });
            return false;
        }
        return true;
    }

    validateJoin(join) {
        if (!join.type || !this.validJoinTypes.includes(join.type.toUpperCase())) {
            this.errors.push({ code: 'INVALID_JOIN_TYPE', message: `Invalid join type: ${join.type}` });
            return false;
        }

        if (!join.table) {
            this.errors.push({ code: 'MISSING_JOIN_TABLE', message: 'Join table is required' });
            return false;
        }

        if (!join.on || !join.on.left || !join.on.right) {
            this.errors.push({ code: 'INVALID_JOIN_CONDITION', message: 'Join condition must have left and right parts' });
            return false;
        }

        if (!this.validOperators.includes(join.on.operator)) {
            this.errors.push({ code: 'INVALID_JOIN_OPERATOR', message: `Invalid join operator: ${join.on.operator}` });
            return false;
        }

        return true;
    }

    validateCondition(condition) {
        if (!condition.field || !condition.field.table || !condition.field.column) {
            this.errors.push({ code: 'INVALID_CONDITION_FIELD', message: 'Condition field must have table and column' });
            return false;
        }

        if (!this.validOperators.includes(condition.operator.toUpperCase())) {
            this.errors.push({ code: 'INVALID_OPERATOR', message: `Invalid operator: ${condition.operator}` });
            return false;
        }

        // Check if value is required for the operator
        const nullOperators = ['IS NULL', 'IS NOT NULL'];
        if (!nullOperators.includes(condition.operator.toUpperCase()) && condition.value === undefined) {
            this.errors.push({ code: 'MISSING_CONDITION_VALUE', message: 'Condition value is required for this operator' });
            return false;
        }

        // Validate column reference if specified
        if (condition.value_type === 'column_reference' && condition.value) {
            if (!this.validateColumnReference(condition.value)) {
                return false;
            }
        }

        return true;
    }

    // Validate column reference format
    validateColumnReference(columnRef) {
        if (typeof columnRef === 'object' && columnRef.table && columnRef.column) {
            return true;
        } else if (typeof columnRef === 'string' && columnRef.includes('.')) {
            const parts = columnRef.split('.');
            if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
                return true;
            }
        }

        this.errors.push({
            code: 'INVALID_COLUMN_REFERENCE',
            message: 'Column reference must be either {table: "table", column: "column"} or "table.column"'
        });
        return false;
    }

    validateOrderByField(field) {
        if (!field.field || !this.validateTableColumn(field.field)) {
            return false;
        }

        if (!field.direction || !this.validDirections.includes(field.direction.toUpperCase())) {
            this.errors.push({ code: 'INVALID_ORDER_DIRECTION', message: `Invalid order direction: ${field.direction}` });
            return false;
        }

        return true;
    }

    // Utility functions
    escapeIdentifier(identifier) {
        if (typeof identifier !== 'string') {
            return '`invalid_identifier`';
        }
        return '`' + identifier.replace(/`/g, '``') + '`';
    }

    escapeValue(value) {
        if (value === null || value === undefined) {
            return 'NULL';
        }

        if (typeof value === 'number') {
            return value.toString();
        }

        if (typeof value === 'boolean') {
            return value ? '1' : '0';
        }

        // Escape string values
        return mysql.escape(value);
    }
}

// Export the main function
function convertJsonToMySQL(jsonQuery) {
    const builder = new QueryBuilder();
    return builder.convertToMySQL(jsonQuery);
}

// Usage examples
const exampleQuery = {
    "query_type": "SELECT",
    "select": {
        "fields": [
            {
                "table": "users",
                "column": "id",
                "alias": "user_id"
            },
            {
                "table": "users",
                "column": "name"
            },
            {
                "table": "orders",
                "column": "total",
                "aggregation": "SUM",
                "alias": "total_orders"
            }
        ],
        "distinct": false
    },
    "from": {
        "primary_table": "users",
        "joins": [
            {
                "type": "LEFT",
                "table": "orders",
                "on": {
                    "left": { "table": "users", "column": "id" },
                    "right": { "table": "orders", "column": "user_id" },
                    "operator": "="
                }
            }
        ]
    },
    "where": {
        "conditions": [
            {
                "logic": "AND",
                "conditionGroup": [
                    {
                        "field": { "table": "users", "column": "status" },
                        "operator": "=",
                        "value": "active"
                    },
                    {
                        "field": { "table": "users", "column": "created_at" },
                        "operator": ">=",
                        "value": "2024-01-01"
                    }
                ]
            }
        ],
        "mainLogic": "AND"
    },
    "group_by": [
        { "table": "users", "column": "id" },
        { "table": "users", "column": "name" }
    ],
    "order_by": [
        {
            "field": { "table": "orders", "column": "total", "aggregation": "SUM" },
            "direction": "DESC"
        }
    ],
    "limit": {
        "count": 10,
        "offset": 0
    }
};

// Example with column reference comparison
const columnComparisonQuery = {
    "query_type": "SELECT",
    "select": {
        "fields": [
            { "table": "budget", "column": "project_id" },
            { "table": "budget", "column": "remaining_budget" },
            { "table": "budget", "column": "total_budget" }
        ],
        "distinct": false
    },
    "from": {
        "primary_table": "budget"
    },
    "where": {
        "conditions": [
            {
                "logic": "AND",
                "conditionGroup": [
                    {
                        "field": { "table": "budget", "column": "remaining_budget" },
                        "operator": "=",
                        "value": { "table": "budget", "column": "total_budget" },
                        "value_type": "column_reference"
                    }
                ]
            }
        ],
        "mainLogic": "AND"
    }
};

// Test the function
console.log('=== Example Usage ===');
const result = convertJsonToMySQL(exampleQuery);
console.log('Generated Query:', result.query);
console.log('Errors:', result.errors);

console.log('\n=== Column Reference Example ===');
const columnResult = convertJsonToMySQL(columnComparisonQuery);
console.log('Generated Query:', columnResult.query);
console.log('Errors:', columnResult.errors);
// This should generate: SELECT `budget`.`project_id`, `budget`.`remaining_budget`, `budget`.`total_budget` FROM `budget` WHERE (`budget`.`remaining_budget` = `budget`.`total_budget`) 

module.exports = {
    convertJsonToMySQL,
    QueryBuilder
};