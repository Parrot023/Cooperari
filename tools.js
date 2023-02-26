const mysql = require('mysql2');
const fs = require('fs');
const { response } = require('express');
require('dotenv').config();


// DATABASE PART ---------------------------------------------------------

let connectToSqlServer = function() {

    /*
    mysql2 is used to establish a connection to the mysql server. mysql2 was chosen 
    over mysql1 as it is never, but it also elimated some authentication errors. 
    Database credentials are stored in a .env file
    */

    let conn = mysql.createConnection({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
    })

    return conn;
};

let setDB = function(conn, db_name) {

    /*
    This function takes a mysql connection and a database name to select the wanted database.
    setDB does not return anything but it is neccescary for the other database related funcitions
    to function
    */

    conn.query('USE ' + db_name + ";", (err, result) => {
        if (err) throw err;
    });
}

let createTable = function(conn, tableName, tableData) {

    /*
    createTable as the name implies creates a table. To do this it needs a mysql connection (conn)
    a table name (tableName) and data about the table to be created (tableData)

    tableData is given in the form [["colName", "colType"], ..., ["colName", "colType"]]

    For furture optimization it would be cool for this function to create the necessary tables based
    on the JSON object deviceTypes

    also for future developement the function must check if a table exists or be able to handle
    the error from mysql when trying to create a table with an already existing name
    */

    let name = tableName;

    let cols = "";

    for (let i = 0; i < tableData.length; i++) {
        let colName = tableData[i][0];
        let colType = tableData[i][1];
    
        // This can be improved by just adding a comma if this if statement is false
        if (i == tableData.length - 1) cols += colName + " " + colType;
        
        else cols += colName + " " + colType + ", ";

    }

    let sql = "CREATE TABLE " + name + " (" + cols + ");";
   
    conn.query(sql, (err, result) => {
        if (err) throw err;
        return result;
    })
}

let insertIntoTable = function(conn, tableName, data) {

    /*
    insertIntoTable as the name implies inserts a new row of data into a table. 
    To do this it needs a mysql connection (conn) a table name (table) and the data (data) 
    to be inserted.

    For future developement the fucntion most do more error handling. Like checking if the table
    exists and whheter or not the data is correct or missing parts.
    */

    let order = "";
    let values = "";

    for (let i = 0; i < data.length; i ++) {
        
        if (i == data.length - 1) order += data[i][0];
        else order += data[i][0] + ", ";
        
        
        if (i == data.length - 1) values += "'" + data[i][1] + "'";
        else values += "'" + data[i][1] + "'" + ", ";

    }

    sql = "INSERT INTO " + tableName + " (" + order + ") VALUES (" + values + ");"

    conn.query("INSERT INTO " + tableName + " (" + order + ") VALUES (" + values + ");", (err, result) => {
        if (err) throw err;
        console.log("Device inserted")
        return result
    })
}

// Updatas data in a table based on som changes and conditions
let updateTable = function (conn, table, where, data) {

    /*
    updateTable takes a mysql connection (conn) a table name (table) data about where
    the data must be updated and the data to be updated. This function could also benefit from
    some error handling for missing or incorret data 
    */

    let conditions = "";
    let changes = "";

    let iterations = data.length;

    if (where.length > data.length) iterations = where.length;
    
    for (let i = 0; i < iterations; i ++) {

        // As there might be more condtions than data to be inserted and vice versa
        // we have to check if there are more condtitions or data
        if (where[i]) {
            conditions += where[i][0] + "=" + "'" + where[i][1] + "'";
            // Add commas if not the last
            if (i != where.length - 1) conditions += ",";

        }

        if (data[i]) {
            changes += data[i][0] + "=" + "'" + data[i][1] + "'"; 
            // Add commas if not the last
            if (i != data.length - 1) changes += ",";
        }

        
    }

    let sql = "UPDATE " + table + " SET " + changes + " WHERE " + conditions + ";"

    conn.query(sql, (err, result) => {
        if (err) throw err;
        return result;
    })
}

// Reads data from table based on conditions in the form ["col1", "hi"] (col1='hi')
// Calls callback when query is done
let readFromTable = function (conn, tableName, where, callback) {

    /*
    readFromTable retrieves every col in a given table based on conditions 
    in the form [["colName", "value"], ..., ["colName", "value"]]. For this a mysql connection (conn)
    is needed and a table name (tableName). When reading is done the callback is called with the
    result as an input parameter
    */

    let conditions = "";

    
    for (let i = 0; i < where.length; i ++) {

        if (where[i]) conditions += where[i][0] + "=" + "'" + where[i][1] + "'";

        // Commas are added if not the last condition
        if (i != where.length - 1) conditions += ",";

    }

    let sql = "SELECT * FROM " + tableName + " WHERE " + conditions + ";"

    conn.query(sql, (err, result) => {
        if (err) throw err;
        // Calls callback when query is done
        callback(result);
    })
}

// Exports functions ----------------------------------------------------------
module.exports = {
    connectToSqlServer: connectToSqlServer,
    setDB: setDB,
    createTable: createTable,
    insertIntoTable: insertIntoTable,
    updateTable: updateTable,
    readFromTable: readFromTable
}