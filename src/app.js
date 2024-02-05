const express = require("express");
const fse = require("fs-extra");
const csvParse = require("csv-parse");
const zlib = require("zlib");
const sqlite3 = require("sqlite3");
const { promisify } = require("util");

const path = require('path');

const app = express();

const cors = require("cors");
const azureCient = require("./utils/azureCient");
const plotAgent = require("./utils/plot-agent");

// Initialize SQLite database
const db = new sqlite3.Database("mydatabase.db");

// Promisify db.run and db.get
const dbRun = promisify(db.run.bind(db));
const dbGet = promisify(db.get.bind(db));

async function initDB() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS shopping_centers_ft (
        day DATE,
        id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        ft INT,
        state CHAR(2),
        city VARCHAR(255),
        formatted_address VARCHAR(255),
        lon DECIMAL(10, 8),
        lat DECIMAL(10, 8),
        PRIMARY KEY (day, id)
    );
  `;

  db.run(createTableQuery, (err) => {
    if (err) {
      console.error("Error creating table:", err);
      return;
    }
    console.log("Table shopping_centers_ft created or already exists.");
  });
}

async function loadCSVToSQLite(filePath) {
  try {
    await initDB();

    const fileContent = await fse.readFile(filePath);
    const decompressed = zlib.gunzipSync(fileContent);

    const parser = csvParse.parse(decompressed.toString(), {
      columns: true,
      skip_empty_lines: true,
    });

    for await (const row of parser) {
      const insertQuery = `
        INSERT OR IGNORE INTO shopping_centers_ft 
        (day, id, name, ft, state, city, formatted_address, lon, lat)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      await dbRun(insertQuery, [
        row.day,
        row.id,
        row.name,
        row.ft,
        row.state,
        row.city,
        row.formatted_address,
        row.lon,
        row.lat,
      ]);
    }
  } catch (error) {
    console.error("Error in loadCSVToSQLite:", error);
    throw error;
  }
}

async function processUserInput(userPrompt) {
  //azureCient.createChatCompletion()
}

app.get("/entries", cors(), async (req, res) => {
  try {
    const selectQuery = `SELECT * FROM shopping_centers_ft`;
    db.all(selectQuery, [], (err, rows) => {
      if (err) {
        console.error("Error fetching data:", err);
        res.status(500).send("Error fetching data from the database");
        return;
      }
      res.json(rows);
    });
  } catch (error) {
    console.error("Error on /entries route:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Route to fetch distinct names and IDs of all shopping centers
app.get("/get-shopping-center-names", cors(), async (req, res) => {
  const cityName = req.query.city;
  try {
    const selectQuery = `SELECT DISTINCT name, id, city, state FROM shopping_centers_ft`;
    db.all(selectQuery, [], (err, rows) => {
      if (err) {
        console.error("Error fetching data:", err);
        res.status(500).send("Error fetching data from the database");
        return;
      }
      res.json(rows);
    });
  } catch (error) {
    console.error("Error on /get-shopping-center-names route:", error);
    res.status(500).send("Internal Server Error");
  }
});

// Route to fetch distinct names and IDs of all shopping centers
app.get("/get-center-data", cors(), async (req, res) => {
  const cityName = req.query.city;
  const centerName = req.query.center;

  console.log(req.query);

  try {
    let selectQuery = `SELECT DISTINCT name, id, city, state FROM shopping_centers_ft`;
    const params = [];

    // Check if a name filter is provided in the request
    if (centerName) {
      selectQuery += ` WHERE name LIKE ?`;
      params.push(`%${centerName}%`); // % symbols are wildcards in SQL LIKE
    }

    db.all(selectQuery, params, (err, rows) => {
      if (err) {
        console.error("Error fetching data:", err);
        res.status(500).send("Error fetching data from the database");
        return;
      }
      res.json(rows);
    });
  } catch (error) {
    console.error("Error on /get-shopping-center-names route:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/foot-traffic-trend/:centerId", cors(), async (req, res) => {
  try {
    const centerId = req.params.centerId;
    const selectQuery = `
            SELECT day, ft 
            FROM shopping_centers_ft 
            WHERE id = ? 
            ORDER BY day ASC`;

    db.all(selectQuery, [centerId], (err, rows) => {
      if (err) {
        console.error("Error fetching data:", err);
        res.status(500).send("Error fetching data from the database");
        return;
      }
      res.json(rows);
    });
  } catch (error) {
    console.error("Error on /foot-traffic-trend route:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/plot", cors(), async (req, res) => {
  try {
    const userPrompt = req.query.prompt;

    const response = await plotAgent.plot(userPrompt);

    try {
      db.all(response.query, response.params, async (err, rows) => {
        if (err) {
          console.error("Error fetching data:", err);
          res.status(500).send("Error fetching data from the database");
          return;
        }

        const limitedRows = rows.splice(0, 20);

        const summaryJSON = await plotAgent.chat(
          JSON.stringify(limitedRows),
          userPrompt
        );
        res.json(summaryJSON);
      });
    } catch (error) {
      console.error("Error on /foot-traffic-trend route:", error);
      res.status(500).send("Internal Server Error");
    }
  } catch (error) {
    console.error("Error on /foot-traffic-trend route:", error);
    res.status(500).send("Internal Server Error");
  }
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

loadCSVToSQLite("./data/florida_complexes.csv.gz");

app.use('/', express.static(path.join(__dirname, './../public')));
app.get('/*', function (req, res) {
  console.log(path.join(__dirname, './../public', 'index.html'));

  res.sendFile(path.join(__dirname, './../public', 'index.html'), function (err) {
    if (err) {
      res.status(500).send(err)
    }
  })
})

