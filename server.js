const express = require("express");
const sqlite3 = require("sqlite3").verbose();

const app = express();
const port = 3000;

const dbCount = 8;
const dbPaths = Array.from(
  { length: dbCount },
  (_, i) => `/app/tmp/natega_part${i + 1}.db`
);
const dbs = dbPaths.map(
  (path) =>
    new sqlite3.Database(path, (err) => {
      if (err) {
        console.error(`Error opening database ${path}:`, err.message);
      } else {
        console.log(`Connected to the SQLite database ${path}.`);
      }
    })
);

app.get("/search", (req, res) => {
  const targetNumber = Number(req.query.target); // Get target number from query params
  const columnName = req.query.column; // Get column name from query params

  if (!targetNumber || !columnName) {
    return res
      .status(400)
      .json({ error: "Missing target number or column name" });
  }

  // Prepare the SQL query
  const query = `SELECT * FROM natega WHERE ${columnName} = ?`;

  let found = false;
  let completed = 0;

  dbs.forEach((db) => {
    db.get(query, [targetNumber], (err, row) => {
      completed++;
      if (err) {
        if (!found && completed === dbCount) {
          return res.status(500).json({ error: err.message });
        }
      } else if (row) {
        found = true;
        return res.json({ message: "Number found", data: row });
      }
      if (completed === dbCount && !found) {
        res.json({ message: "Number not found" });
      }
    });
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

// Close the database connections when the process is terminated
process.on("SIGINT", () => {
  dbs.forEach((db) => {
    db.close((err) => {
      if (err) {
        console.error("Error closing database:", err.message);
      } else {
        console.log("Database connection closed.");
      }
    });
  });
  process.exit(0);
});
