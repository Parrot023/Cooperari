const mysql = require('mysql2');
require('dotenv').config();


// CLIENT PART ----------------------------------------------------------

let return_message = {
    "message": "hi",
};

// Client object to handle the connection with the client
function Client(conn, id) {

    this.conn = conn;
    this.id = id;

    this.conn.on('data', data => {
        
        console.log("Data recieved from client " + this.id + ": ", data.toString());

        this.conn.write(JSON.stringify(return_message) + "\n");

        console.log("Sending back: ", JSON.stringify(return_message) + "\n");

    });

    this.conn.on('end', () => {

        console.log("Client " + this.id + ": left");

    })
}

// DATABASE PART ---------------------------------------------------------

// Connects to the sql server
let connectToSqlServer = function() {
    let conn = mysql.createConnection({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.PASSWORD,
    })

    return conn;
};

// Uses the conn object to select the wanted database
let setDB = function(db_name) {
    conn.query('USE ' + db_name + ";", (err, result) => {
        if (err) throw err;
        console.log(result);
    });
}

// Creates a table based on given data
let createTable = function(conn, tableName, tableData) {

    // Should check if the table already exists

    let name = tableName;

    let cols = "";

    for (let i = 0; i < tableData.length; i++) {
        let colName = tableData[i][0];
        let colType = tableData[i][1];
    
        if (i == tableData.length - 1) cols += colName + " " + colType;
        
        else cols += colName + " " + colType + ", ";

    }

    let sql = "CREATE TABLE " + name + " (" + cols + ");";
   
    console.log(sql);

    conn.query(sql, (err, result) => {
        if (err) throw err;
        return result;
    })
}

// Inserts a new row of data into a table
// Needs some error handling in terms of missing data or wrong data
let insertIntoTable = function(conn, table, data) {

    let order = "";
    let values = "";

    for (let i = 0; i < data.length; i ++) {
        
        if (i == data.length - 1) order += data[i][0];
        else order += data[i][0] + ", ";
        
        
        if (i == data.length - 1) values += "'" + data[i][1] + "'";
        else values += "'" + data[i][1] + "'" + ", ";

    }

    sql = "INSERT INTO " + table + " (" + order + ") VALUES (" + values + ");"

    console.log(sql)

    conn.query("INSERT INTO " + table + " (" + order + ") VALUES (" + values + ");", (err, result) => {
        if (err) throw err;
        return result
    })
}

// Updatas data in a table based on som changes and conditions
let updateTable = function (conn, table, where, data) {

    let conditions = "";
    let changes = "";

    let iterations = data.length;

    if (where.length > data.length) iterations = where.length;
    
    for (let i = 0; i < iterations; i ++) {

        if (where[i]) conditions += where[i][0] + "=" + "'" + where[i][1] + "'";
        if (data[i]) changes += data[i][0] + "=" + "'" + data[i][1] + "'"; 


        // Add commas if not the last
        if (i != data.length - 1) changes += ",";
        if (i != where.length - 1) conditions += ",";

    }

    let sql = "UPDATE " + table + " SET " + changes + " WHERE " + conditions + ";"

    conn.query(sql, (err, result) => {
        if (err) throw err;
        return result;
    })
}

// Reads data from table based on conditions in the form ["col1", "hi"] (col1='hi')
// Calls callback when query is done
let readFromTable = function (conn, table, where, callback) {

    let conditions = "";

    
    for (let i = 0; i < where.length; i ++) {

        if (where[i]) conditions += where[i][0] + "=" + "'" + where[i][1] + "'";

        // Add commas if not the last
        if (i != where.length - 1) conditions += ",";

    }

    let sql = "SELECT * FROM " + table + " WHERE " + conditions + ";"

    conn.query(sql, (err, result) => {
        if (err) throw err;
        // Calls callback when query is done
        callback(result);
    })
}

// Exports functions ----------------------------------------------------------
module.exports = {
    Client: Client,
    connectToSqlServer: connectToSqlServer,
    setDB: setDB,
    createTable: createTable,
    insertIntoTable: insertIntoTable,
    updateTable: updateTable,
    readFromTable: readFromTable
}