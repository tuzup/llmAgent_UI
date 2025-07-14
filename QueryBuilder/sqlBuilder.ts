
// Configuration constants
const CONFIG = {
    validOperators: ['=', '!=', '<', '>', '<=', '>=', 'LIKE', 'IN', 'NOT IN', 'BETWEEN', 'IS NULL', 'IS NOT NULL'],
    validJoinTypes: ['INNER', 'LEFT', 'RIGHT', 'FULL'],
    validAggregations: ['SUM', 'COUNT', 'AVG', 'MAX', 'MIN'],
    validLogic: ['AND', 'OR'],
    validDirections: ['ASC', 'DESC'],
    validWindowFunctions: ['ROW_NUMBER', 'RANK', 'DENSE_RANK', 'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE'],

};

// Utility functions
function escapeIdentifier(identifier) {
    if (typeof identifier !== 'string') {
        return '`invalid_identifier`';
    }
    return '`' + identifier.replace(/`/g, '``') + '`';
}

function escapeValue(value) {
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
    // Escape string values manually (single quotes, backslashes, and control chars)
    if (typeof value === 'string') {
        return "'" + value
            .replace(/\\/g, '\\\\')
            .replace(/'/g, "\\'")
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\x00/g, '\\0')
            .replace(/\x1a/g, '\\Z') + "'";
    }
    return "'invalid_value'";
}

// Validation functions
function validateField(field, errors) {
    if (!field || typeof field !== 'object') {
        errors.push({ code: 'INVALID_FIELD', message: 'Field must be an object' });
        return false;
    }

    if (!field.table || !field.column) {
        errors.push({ code: 'MISSING_FIELD_INFO', message: 'Field must have table and column' });
        return false;
    }

    return true;
}

function validateTableColumn(field, errors) {
    if (!field || !field.table || !field.column) {
        errors.push({ code: 'INVALID_TABLE_COLUMN', message: 'Table and column are required' });
        return false;
    }
    return true;
}

function validateJoin(join, errors) {
    if (!join.type || !CONFIG.validJoinTypes.includes(join.type.toUpperCase())) {
        errors.push({ code: 'INVALID_JOIN_TYPE', message: `Invalid join type: ${join.type}` });
        return false;
    }

    if (!join.table) {
        errors.push({ code: 'MISSING_JOIN_TABLE', message: 'Join table is required' });
        return false;
    }

    if (!join.on || !join.on.left || !join.on.right) {
        errors.push({ code: 'INVALID_JOIN_CONDITION', message: 'Join condition must have left and right parts' });
        return false;
    }

    if (!CONFIG.validOperators.includes(join.on.operator)) {
        errors.push({ code: 'INVALID_JOIN_OPERATOR', message: `Invalid join operator: ${join.on.operator}` });
        return false;
    }

    return true;
}

function validateColumnReference(columnRef, errors) {
    if (typeof columnRef === 'object' && columnRef.table && columnRef.column) {
        return true;
    } else if (typeof columnRef === 'string' && columnRef.includes('.')) {
        const parts = columnRef.split('.');
        if (parts.length === 2 && parts[0].trim() && parts[1].trim()) {
            return true;
        }
    }

    errors.push({
        code: 'INVALID_COLUMN_REFERENCE',
        message: 'Column reference must be either {table: "table", column: "column"} or "table.column"'
    });
    return false;
}

function validateCondition(condition, errors) {
    if (!condition.field || !condition.field.table || !condition.field.column) {
        errors.push({ code: 'INVALID_CONDITION_FIELD', message: 'Condition field must have table and column' });
        return false;
    }

    if (!CONFIG.validOperators.includes(condition.operator.toUpperCase())) {
        errors.push({ code: 'INVALID_OPERATOR', message: `Invalid operator: ${condition.operator}` });
        return false;
    }

    // Check if value is required for the operator
    const nullOperators = ['IS NULL', 'IS NOT NULL'];
    if (!nullOperators.includes(condition.operator.toUpperCase()) && condition.value === undefined) {
        errors.push({ code: 'MISSING_CONDITION_VALUE', message: 'Condition value is required for this operator' });
        return false;
    }

    // Validate column reference if specified
    if (condition.value_type === 'column_reference' && condition.value) {
        if (!validateColumnReference(condition.value, errors)) {
            return false;
        }
    }

    return true;
}

function validateOrderByField(field, errors) {
    if (!field.field || !validateTableColumn(field.field, errors)) {
        return false;
    }

    if (!field.direction || !CONFIG.validDirections.includes(field.direction.toUpperCase())) {
        errors.push({ code: 'INVALID_ORDER_DIRECTION', message: `Invalid order direction: ${field.direction}` });
        return false;
    }

    return true;
}

function validateQueryStructure(jsonQuery, errors) {
    if (!jsonQuery || typeof jsonQuery !== 'object') {
        errors.push({ code: 'INVALID_QUERY', message: 'Query must be a valid object' });
        return false;
    }

    if (jsonQuery.query_type !== 'SELECT') {
        errors.push({ code: 'UNSUPPORTED_QUERY_TYPE', message: 'Only SELECT queries are supported' });
        return false;
    }

    if (!jsonQuery.select || !jsonQuery.from) {
        errors.push({ code: 'MISSING_REQUIRED_FIELDS', message: 'SELECT and FROM clauses are required' });
        return false;
    }

    return true;
}

// Column reference builder
function buildColumnReference(columnRef, errors) {
    if (typeof columnRef === 'object' && columnRef.table && columnRef.column) {
        // Handle object format: { table: "table_name", column: "column_name" }
        return `${escapeIdentifier(columnRef.table)}.${escapeIdentifier(columnRef.column)}`;
    } else if (typeof columnRef === 'string' && columnRef.includes('.')) {
        // Handle string format: "table_name.column_name"
        const parts = columnRef.split('.');
        if (parts.length === 2) {
            return `${escapeIdentifier(parts[0])}.${escapeIdentifier(parts[1])}`;
        }
    }

    errors.push({ code: 'INVALID_COLUMN_REFERENCE', message: 'Invalid column reference format' });
    return 'NULL';
}

// Single condition builder
function buildSingleCondition(condition, errors) {
    if (!validateCondition(condition, errors)) {
        return null;
    }

    let field = '';
    if (condition.field.aggregation) {
        field = `${condition.field.aggregation.toUpperCase()}(${escapeIdentifier(condition.field.table)}.${escapeIdentifier(condition.field.column)})`;
    } else {
        field = `${escapeIdentifier(condition.field.table)}.${escapeIdentifier(condition.field.column)}`;
    }

    // const field = `${escapeIdentifier(condition.field.table)}.${escapeIdentifier(condition.field.column)}`;
    const operator = condition.operator.toUpperCase();

    // Handle different operators
    switch (operator) {
        case 'IS NULL':
        case 'IS NOT NULL':
            return `${field} ${operator}`;

        case 'IN':
        case 'NOT IN':
            if (!Array.isArray(condition.value)) {
                errors.push({ code: 'INVALID_IN_VALUE', message: 'IN/NOT IN requires array value' });
                return null;
            }
            const values = condition.value.map(val => escapeValue(val)).join(', ');
            return `${field} ${operator} (${values})`;

        case 'BETWEEN':
            if (!Array.isArray(condition.value) || condition.value.length !== 2) {
                errors.push({ code: 'INVALID_BETWEEN_VALUE', message: 'BETWEEN requires array with exactly 2 values' });
                return null;
            }
            return `${field} BETWEEN ${escapeValue(condition.value[0])} AND ${escapeValue(condition.value[1])}`;

        default:
            // Handle column reference vs literal value
            if (condition.value_type === 'column_reference') {
                return `${field} ${operator} ${buildColumnReference(condition.value, errors)}`;
            } else {
                return `${field} ${operator} ${escapeValue(condition.value)}`;
            }
    }
}

// Conditions builder (recursive)
function buildConditions(conditions, mainLogic, errors) {
    if (!conditions || conditions.length === 0) {
        return '';
    }

    const conditionStrings = conditions.map(condition => {
        if (condition.conditionGroup && Array.isArray(condition.conditionGroup)) {
            const groupConditions = condition.conditionGroup.map(cond => {
                return buildSingleCondition(cond, errors);
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

// SELECT clause builder
function buildSelectClause(selectObj, windowFunctions, errors) {
    if (!selectObj.fields || !Array.isArray(selectObj.fields) || selectObj.fields.length === 0) {
        errors.push({ code: 'EMPTY_SELECT', message: 'SELECT fields cannot be empty' });
        return 'SELECT * ';
    }

    const fields = selectObj.fields.map(field => {
        if (!validateField(field, errors)) {
            return null;
        }

        let fieldStr = '';
        // Add aggregation if present
        if (field.aggregation) {
            if (!CONFIG.validAggregations.includes(field.aggregation.toUpperCase())) {
                errors.push({ code: 'INVALID_AGGREGATION', message: `Invalid aggregation: ${field.aggregation}` });
                return null;
            }
            fieldStr = `${field.aggregation.toUpperCase()}(${escapeIdentifier(field.table)}.${escapeIdentifier(field.column)})`;
        } else {
            fieldStr = `${escapeIdentifier(field.table)}.${escapeIdentifier(field.column)}`;
        }

        // Add alias if present
        if (field.alias) {
            fieldStr += ` AS ${escapeIdentifier(field.alias)}`;
        }

        return fieldStr;
    }).filter(field => field !== null);

    // Add window functions to the field list
    if (windowFunctions && Array.isArray(windowFunctions)) {
        windowFunctions.forEach(windowFunc => {
            const windowExpression = buildWindowFunction(windowFunc, errors);
            if (windowExpression) {
                fields.push(windowExpression);
            }
        });
    }

    if (fields.length === 0) {
        errors.push({ code: 'NO_VALID_FIELDS', message: 'No valid fields found in SELECT clause' });
        return 'SELECT * ';
    }

    const distinct = selectObj.distinct ? 'DISTINCT ' : '';
    return `SELECT ${distinct}${fields.join(', ')} `;
  }

// FROM clause builder with JOINs
function buildFromClause(fromObj, errors) {
    if (!fromObj.primary_table) {
        errors.push({ code: 'MISSING_PRIMARY_TABLE', message: 'Primary table is required' });
        return 'FROM ';
    }

    let fromClause = `FROM ${escapeIdentifier(fromObj.primary_table)} `;

    // Add JOINs
    if (fromObj.joins && Array.isArray(fromObj.joins)) {
        fromObj.joins.forEach(join => {
            if (!validateJoin(join, errors)) {
                return;
            }

            const joinType = join.type.toUpperCase();
            const joinTable = escapeIdentifier(join.table);
            const leftTable = escapeIdentifier(join.on.left.table);
            const leftColumn = escapeIdentifier(join.on.left.column);
            const rightTable = escapeIdentifier(join.on.right.table);
            const rightColumn = escapeIdentifier(join.on.right.column);
            const operator = join.on.operator;

            fromClause += `${joinType} JOIN ${joinTable} ON ${leftTable}.${leftColumn} ${operator} ${rightTable}.${rightColumn} `;
        });
    }

    return fromClause;
}

// WHERE clause builder
function buildWhereClause(whereObj, errors) {
    if (!whereObj.conditions || !Array.isArray(whereObj.conditions)) {
        return '';
    }

    const conditions = buildConditions(whereObj.conditions, whereObj.mainLogic || 'AND', errors);
    return conditions ? `WHERE ${conditions} ` : '';
}

// GROUP BY clause builder
function buildGroupByClause(groupByFields, errors) {
    const fields = groupByFields.map(field => {
        if (!validateTableColumn(field, errors)) {
            return null;
        }
        return `${escapeIdentifier(field.table)}.${escapeIdentifier(field.column)}`;
    }).filter(field => field !== null);

    return fields.length > 0 ? `GROUP BY ${fields.join(', ')} ` : '';
}

// HAVING clause builder
function buildHavingClause(havingObj, errors) {
    if (!havingObj.conditions || !Array.isArray(havingObj.conditions)) {
        return '';
    }

    const conditions = buildConditions(havingObj.conditions, havingObj.logic || 'AND', errors);
    return conditions ? `HAVING ${conditions} ` : '';
}

// ORDER BY clause builder
function buildOrderByClause(orderByFields, errors) {
    const fields = orderByFields.map(field => {
        if (!validateOrderByField(field, errors)) {
            return null;
        }

        let fieldStr = '';
        if (field.field.aggregation) {
            fieldStr = `${field.field.aggregation.toUpperCase()}(${escapeIdentifier(field.field.table)}.${escapeIdentifier(field.field.column)})`;
        } else {
            fieldStr = `${escapeIdentifier(field.field.table)}.${escapeIdentifier(field.field.column)}`;
        }

        fieldStr += ` ${field.direction.toUpperCase()}`;
        return fieldStr;
    }).filter(field => field !== null);

    return fields.length > 0 ? `ORDER BY ${fields.join(', ')} ` : '';
}

// LIMIT clause builder
function buildLimitClause(limitObj, errors) {
    if (!limitObj.count || typeof limitObj.count !== 'number' || limitObj.count <= 0) {
        errors.push({ code: 'INVALID_LIMIT', message: 'Limit count must be a positive number' });
        return '';
    }

    let limitClause = `LIMIT ${limitObj.count}`;

    if (limitObj.offset && typeof limitObj.offset === 'number' && limitObj.offset > 0) {
        limitClause += ` OFFSET ${limitObj.offset}`;
    }

    return limitClause + ' ';
}

function validateWindowFunction(windowFunc, errors) {
    if (!windowFunc.function || !CONFIG.validWindowFunctions.includes(windowFunc.function.toUpperCase())) {
        errors.push({ code: 'INVALID_WINDOW_FUNCTION', message: `Invalid window function: ${windowFunc.function}` });
        return false;
    }

    if (!windowFunc.alias) {
        errors.push({ code: 'MISSING_WINDOW_ALIAS', message: 'Window function must have an alias' });
        return false;
    }

    // Validate partition_by fields
    if (windowFunc.partition_by && Array.isArray(windowFunc.partition_by)) {
        for (const field of windowFunc.partition_by) {
            if (!validateTableColumn(field, errors)) {
                return false;
            }
        }
    }

    // Validate order_by fields
    if (windowFunc.order_by && Array.isArray(windowFunc.order_by)) {
        for (const orderField of windowFunc.order_by) {
            if (!validateOrderByField(orderField, errors)) {
                return false;
            }
        }
    }

    return true;
}

function buildWindowFunction(windowFunc, errors) {
    if (!validateWindowFunction(windowFunc, errors)) {
        return null;
    }

    const functionName = windowFunc.function.toUpperCase();

    // Build PARTITION BY clause
    let partitionBy = '';
    if (windowFunc.partition_by && windowFunc.partition_by.length > 0) {
        const partitionFields = windowFunc.partition_by.map(field =>
            `${escapeIdentifier(field.table)}.${escapeIdentifier(field.column)}`
        );
        partitionBy = `PARTITION BY ${partitionFields.join(', ')}`;
    }

    // Build ORDER BY clause
    let orderBy = '';
    if (windowFunc.order_by && windowFunc.order_by.length > 0) {
        const orderFields = windowFunc.order_by.map(orderField => {
            let fieldStr = `${escapeIdentifier(orderField.field.table)}.${escapeIdentifier(orderField.field.column)}`;
            if (orderField.field.aggregation) {
                fieldStr = `${orderField.field.aggregation.toUpperCase()}(${fieldStr})`;
            }
            return `${fieldStr} ${orderField.direction.toUpperCase()}`;
        });
        orderBy = `ORDER BY ${orderFields.join(', ')}`;
    }

    // Build OVER clause
    const overParts: string[] = [];
    if (partitionBy) overParts.push(partitionBy);
    if (orderBy) overParts.push(orderBy);
    const overClause = `OVER (${overParts.join(' ')})`;

    // Build complete window function expression
    const windowExpression = `${functionName}() ${overClause} AS ${escapeIdentifier(windowFunc.alias)}`;

    return windowExpression;
}


// Main conversion function
function convertToMySQL(jsonQuery) {
    const errors: { code: string; message: string }[] = [];

    try {
        // Validate query structure
        if (!validateQueryStructure(jsonQuery, errors)) {
            return { query: null, errors };
        }

        // Build the query
        let query = buildSelectClause(jsonQuery.select, jsonQuery.window_functions, errors);
        query += buildFromClause(jsonQuery.from, errors);

        if (jsonQuery.where) {
            query += buildWhereClause(jsonQuery.where, errors);
        }

        if (jsonQuery.group_by && jsonQuery.group_by.length > 0) {
            query += buildGroupByClause(jsonQuery.group_by, errors);
        }

        if (jsonQuery.having) {
            query += buildHavingClause(jsonQuery.having, errors);
        }

        if (jsonQuery.order_by && jsonQuery.order_by.length > 0) {
            query += buildOrderByClause(jsonQuery.order_by, errors);
        }

        if (jsonQuery.limit) {
            query += buildLimitClause(jsonQuery.limit, errors);
        }

        return {
            query: query.trim(),
            errors: errors.length > 0 ? errors : null
        };
    } catch (error) {
        errors.push({ code: 'CONVERSION_ERROR', message: error.message });
        return { query: null, errors };
    }
}

// Main export function (alias for convertToMySQL)
function convertJsonToMySQL(jsonQuery) {
    return convertToMySQL(jsonQuery);
}

// Usage examples
const exampleQueryBuilder = {
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
const columnComparisonQuerySqlBuilder = {
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
const resultSql = convertJsonToMySQL(exampleQueryBuilder);
console.log('Generated Query:', resultSql.query);
console.log('Errors:', resultSql.errors);

console.log('\n=== Column Reference Example ===');
const columnResultSql = convertJsonToMySQL(columnComparisonQuerySqlBuilder);
console.log('Generated Query:', columnResultSql.query);
console.log('Errors:', columnResultSql.errors);
// This should generate: SELECT `budget`.`project_id`, `budget`.`remaining_budget`, `budget`.`total_budget` FROM `budget` WHERE (`budget`.`remaining_budget` = `budget`.`total_budget`) 

const args = `{\"query_type\":\"SELECT\",\"select\":{\"fields\":[{\"table\":\"departments\",\"column\":\"name\",\"alias\":\"department_name\"},{\"table\":\"orders\",\"column\":\"total_amount\",\"aggregation\":\"SUM\",\"alias\":\"total_revenue\"},{\"table\":\"users\",\"column\":\"id\",\"aggregation\":\"COUNT\",\"alias\":\"employee_count\"},{\"table\":\"orders\",\"column\":\"total_amount\",\"aggregation\":\"SUM\",\"alias\":\"revenue_per_employee\",\"case_when\":{\"condition\":\"orders.status = 'completed'\",\"when_true\":\"orders.total_amount / COUNT(users.id)\",\"when_false\":\"0\"}}]},\"from\":{\"primary_table\":\"orders\",\"joins\":[{\"type\":\"INNER\",\"table\":\"users\",\"on\":{\"left\":{\"table\":\"orders\",\"column\":\"user_id\"},\"right\":{\"table\":\"users\",\"column\":\"id\"},\"operator\":\"=\"}},{\"type\":\"INNER\",\"table\":\"departments\",\"on\":{\"left\":{\"table\":\"users\",\"column\":\"department_id\"},\"right\":{\"table\":\"departments\",\"column\":\"id\"},\"operator\":\"=\"}}]},\"where\":{\"conditions\":[{\"logic\":\"AND\",\"conditionGroup\":[{\"field\":{\"table\":\"orders\",\"column\":\"status\"},\"operator\":\"=\",\"value\":\"completed\",\"value_type\":\"literal\"},{\"field\":{\"table\":\"orders\",\"column\":\"order_date\"},\"operator\":\"BETWEEN\",\"value\":[\"2025-04-01\",\"2025-06-30\"],\"value_type\":\"literal\"}]}]},\"group_by\":[{\"table\":\"departments\",\"column\":\"id\"}],\"order_by\":[{\"field\":{\"table\":\"orders\",\"column\":\"total_amount\",\"aggregation\":\"SUM\"},\"direction\":\"DESC\"}]}`

const argsJson = JSON.parse(args);
console.log(JSON.stringify(argsJson, null, 2));
const resultArgsSql = convertJsonToMySQL(argsJson);
console.log('Generated Query from args:', resultArgsSql.query);
console.log('Errors from args:', resultArgsSql.errors);
