// Enhanced SQL Builder with comprehensive functionality
const CONFIG = {
    validOperators: ['=', '!=', '<', '>', '<=', '>=', 'LIKE', 'IN', 'NOT IN', 'BETWEEN', 'IS NULL', 'IS NOT NULL', 'EXISTS', 'NOT EXISTS'],
    validJoinTypes: ['INNER', 'LEFT', 'RIGHT', 'FULL'],
    validAggregations: ['SUM', 'COUNT', 'AVG', 'MAX', 'MIN'],
    validLogic: ['AND', 'OR'],
    validDirections: ['ASC', 'DESC'],
    validWindowFunctions: ['ROW_NUMBER', 'RANK', 'DENSE_RANK', 'LAG', 'LEAD', 'FIRST_VALUE', 'LAST_VALUE'],
    validQueryTypes: ['SELECT', 'SUBQUERY']
};

// Enhanced utility functions
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

// Enhanced validation functions
function validateField(field, errors) {
    if (!field || typeof field !== 'object') {
        errors.push({ code: 'INVALID_FIELD', message: 'Field must be an object' });
        return false;
    }

    if (!field.calculated_field && (!field.table || !field.column)) {
        errors.push({ code: 'MISSING_FIELD_INFO', message: 'Field must have table and column' });
        return false;
    }

    if (field.aggregation && !CONFIG.validAggregations.includes(field.aggregation.toUpperCase())) {
        errors.push({ code: 'INVALID_AGGREGATION', message: `Invalid aggregation: ${field.aggregation}` });
        return false;
    }

    return true;
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

    return true;
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

    const nullOperators = ['IS NULL', 'IS NOT NULL'];
    if (!nullOperators.includes(condition.operator.toUpperCase()) && condition.value === undefined) {
        errors.push({ code: 'MISSING_CONDITION_VALUE', message: 'Condition value is required for this operator' });
        return false;
    }

    return true;
}

function validateQueryStructure(jsonQuery, errors) {
    if (!jsonQuery || typeof jsonQuery !== 'object') {
        errors.push({ code: 'INVALID_QUERY', message: 'Query must be a valid object' });
        return false;
    }

    if (!CONFIG.validQueryTypes.includes(jsonQuery.query_type)) {
        errors.push({ code: 'UNSUPPORTED_QUERY_TYPE', message: `Unsupported query type: ${jsonQuery.query_type}` });
        return false;
    }

    if (!jsonQuery.select || !jsonQuery.from) {
        errors.push({ code: 'MISSING_REQUIRED_FIELDS', message: 'SELECT and FROM clauses are required' });
        return false;
    }

    return true;
}

// Enhanced builders
function buildCalculatedField(field, errors) {
    if (!field.calculated_field) {
        return null;
    }

    let expression = field.calculated_field.expression + ` AS ${escapeIdentifier(field.calculated_field.description)}`;

    // // Handle common calculated field patterns
    // if (expression.includes('/')) {
    //     // Division operation - ensure proper handling of zero division
    //     const parts = expression.split('/');
    //     if (parts.length === 2) {
    //         const numerator = parts[0].trim();
    //         const denominator = parts[1].trim();
    //         expression = `CASE WHEN ${denominator} = 0 THEN 0 ELSE ${numerator} / ${denominator} END`;
    //     }
    // }

    return expression;
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
    const overParts = [];
    if (partitionBy) overParts.push(partitionBy);
    if (orderBy) overParts.push(orderBy);
    const overClause = `OVER (${overParts.join(' ')})`;

    return `${functionName}() ${overClause} AS ${escapeIdentifier(windowFunc.alias)}`;
}

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

        // Handle calculated fields
        const calculatedField = buildCalculatedField(field, errors);
        if (calculatedField) {
            fieldStr = calculatedField;
        } else {
            // Regular field or aggregation
            if (field.aggregation) {
                const distinct = field.distinct ? 'DISTINCT ' : '';
                fieldStr = `${field.aggregation.toUpperCase()}(${distinct}${escapeIdentifier(field.table)}.${escapeIdentifier(field.column)})`;
            } else {
                fieldStr = `${escapeIdentifier(field.table)}.${escapeIdentifier(field.column)}`;
            }
        }

        // Add alias if present
        if (field.alias) {
            fieldStr += ` AS ${escapeIdentifier(field.alias)}`;
        }

        return fieldStr;
    }).filter(field => field !== null);

    // Add window functions
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

function buildFromClause(fromObj, errors) {
    if (!fromObj.primary_table && !fromObj.subquery) {
        errors.push({ code: 'MISSING_FROM_SOURCE', message: 'Primary table or subquery is required' });
        return 'FROM ';
    }

    let fromClause = '';

    if (fromObj.subquery) {
        // Handle subquery in FROM clause
        const subqueryResult = convertToMySQL(fromObj.subquery.query);
        if (subqueryResult.errors) {
            errors.push(...subqueryResult.errors);
            return 'FROM ';
        }
        fromClause = `FROM (${subqueryResult.query}) AS ${escapeIdentifier(fromObj.subquery.alias)} `;
    } else {
        fromClause = `FROM ${escapeIdentifier(fromObj.primary_table)} `;
    }

    // Add JOINs
    if (fromObj.joins && Array.isArray(fromObj.joins)) {
        fromObj.joins.forEach(join => {
            if (!validateJoin(join, errors)) {
                return;
              }

            const joinType = join.type.toUpperCase();
            let joinTable = escapeIdentifier(join.table);
            // Add alias if specified for duplicate table joins
            if (join.alias) {
                joinTable += ` AS ${escapeIdentifier(join.alias)}`;
            }
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

    const operator = condition.operator.toUpperCase();

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
        case 'EXISTS':
        case 'NOT EXISTS':
            if (condition.value_type === 'subquery') {
                return `${operator} (${condition.value})`;
            }
            return `${field} ${operator} ${escapeValue(condition.value)}`;
        default:
            if (condition.value_type === 'column_reference') {
                const refTable = escapeIdentifier(condition.value.table);
                const refColumn = escapeIdentifier(condition.value.column);
                return `${field} ${operator} ${refTable}.${refColumn}`;
            } else {
                return `${field} ${operator} ${escapeValue(condition.value)}`;
            }
    }
}

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

function buildWhereClause(whereObj, errors) {
    if (!whereObj.conditions || !Array.isArray(whereObj.conditions)) {
        return '';
    }

    const conditions = buildConditions(whereObj.conditions, whereObj.mainLogic || 'AND', errors);
    return conditions ? `WHERE ${conditions} ` : '';
}

function buildGroupByClause(groupByFields, errors) {
    const fields = groupByFields.map(field => {
        if (!field.table || !field.column) {
            errors.push({ code: 'INVALID_GROUP_BY_FIELD', message: 'GROUP BY field must have table and column' });
            return null;
        }
        return `${escapeIdentifier(field.table)}.${escapeIdentifier(field.column)}`;
    }).filter(field => field !== null);

    return fields.length > 0 ? `GROUP BY ${fields.join(', ')} ` : '';
}

function buildHavingClause(havingObj, errors) {
    if (!havingObj.conditions || !Array.isArray(havingObj.conditions)) {
        return '';
    }

    const conditions = buildConditions(havingObj.conditions, havingObj.mainLogic || 'AND', errors);
    return conditions ? `HAVING ${conditions} ` : '';
}

function buildOrderByClause(orderByFields, errors) {
    const fields = orderByFields.map(field => {
        if (!field.field || !field.field.table || !field.field.column) {
            errors.push({ code: 'INVALID_ORDER_BY_FIELD', message: 'ORDER BY field must have table and column' });
            return null;
        }

        let fieldStr = '';
        if (field.calculated_field) {
            fieldStr = field.calculated_field;
        } else if (field.field.aggregation) {
            fieldStr = `${field.field.aggregation.toUpperCase()}(${escapeIdentifier(field.field.table)}.${escapeIdentifier(field.field.column)})`;
        } else {
            fieldStr = `${escapeIdentifier(field.field.table)}.${escapeIdentifier(field.field.column)}`;
        }

        fieldStr += ` ${field.direction.toUpperCase()}`;
        return fieldStr;
    }).filter(field => field !== null);

    return fields.length > 0 ? `ORDER BY ${fields.join(', ')} ` : '';
}

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

interface QueryError {
    code: string;
    message: string;
}
// Main conversion function
function convertToMySQL(jsonQuery) {
    const errors: QueryError[] = [];

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
            errors: errors.length > 0 ? errors : null,
            metadata: {
                query_type: jsonQuery.query_type,
                tables_involved: extractTablesFromQuery(jsonQuery),
                complexity: calculateQueryComplexity(jsonQuery)
            }
        };
    } catch (error) {
        errors.push({ code: 'CONVERSION_ERROR', message: error.message });
        return { query: null, errors };
    }
}

// Helper functions for metadata
function extractTablesFromQuery(jsonQuery) {
    const tables = new Set();

    if (jsonQuery.from && jsonQuery.from.primary_table) {
        tables.add(jsonQuery.from.primary_table);
    }

    if (jsonQuery.from && jsonQuery.from.joins) {
        jsonQuery.from.joins.forEach(join => tables.add(join.table));
    }

    if (jsonQuery.select && jsonQuery.select.fields) {
        jsonQuery.select.fields.forEach(field => tables.add(field.table));
    }

    return Array.from(tables);
}

function calculateQueryComplexity(jsonQuery) {
    let complexity = 'simple';

    if (jsonQuery.window_functions && jsonQuery.window_functions.length > 0) {
        complexity = 'complex';
    } else if (jsonQuery.from && jsonQuery.from.joins && jsonQuery.from.joins.length > 2) {
        complexity = 'complex';
    } else if (jsonQuery.from && jsonQuery.from.subquery) {
        complexity = 'complex';
    } else if (jsonQuery.group_by && jsonQuery.having) {
        complexity = 'moderate';
    } else if (jsonQuery.from && jsonQuery.from.joins && jsonQuery.from.joins.length > 0) {
        complexity = 'moderate';
    }

    return complexity;
}

// Export the main function
// module.exports = {
//     convertToMySQL,
//     CONFIG
// };
  