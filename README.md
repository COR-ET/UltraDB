# UltraDB

UltraDB is an asynchronous, local encrypted and compressed file based, simple database for Node.js that uses AdvancedBSON format, it is designed for high performance and secured data storage. It uses a custom binary file format (ABSON), in-memory multi indexing, advanced caching, Special AOIS method for data storing, with multi threaded hardware acceleration to achieve fast and efficient data operations.

> **Note:** UltraDB is distributed as a public npm package. You may use UltraDB freely in your projects, but you are **not permitted** to modify, decompile, reverse-engineer, or republish its source code as a standalone product.

---

## Features

- **Asynchronous Operations:** Fully non-blocking API using async/await.
- **Binary (ABSON) File Format:** Efficient disk storage and quick data retrieval.
- **Functional Object Storage:** Ability to store functions inside objects, raw JSON, and any other type of datas (full class storage will be available soon!).
- **In-Memory Indexing:** Fast key-based lookups.
- **Advanced Caching:** Automatically manages cache for faster results.
- **New AOIS method:** in order to reduce disk I/O, without losing any data.
- **Hardware Acceleration:** Offloads CPU-intensive tasks (compression, encryption) to separate threads, and calling GPU when work is overloaded.
- **Advanced Querying:** Supports filtering, sorting, and pagination of records.
- **Optional History Logging:** Enable history logging to track changes over time.
- (And more coming soon!)

---

## Installation

UltraDB uses only built-in Node.js, so no additional dependencies are required.

To install UltraDB, run:

```bash
npm install ultra-db.js
```

## Quick Start
Here is a simple and basic example to get you started:

```javascript
const UltraDB = require('ultra-db.js');

(async () => {
  // Initialize UltraDB:
  // - "myDatabase" will be the base name for the database file (myDatabase.udb).
  // - The second parameter is your custom encryption key. If omitted, a default key is used (will show a warning).
  // - The third parameter (optional) enables history logging (Disabled by defult).
  
  const db = new UltraDB("myDatabase", "your-custom-db-key", true);

  // Wait until UltraDB is fully loaded (Not needed, but still recommended to avoid additional wait of PreLoading).
  await db.load();

  // Store a simple data in the database
  await db.set("username", "Pili");

  // Retrieve the stored value
  const value = await db.get("username");
  console.log("Retrieved value:", value);

  // Delete the record associated with the key
  await db.delete("username");

  // Advanced querying example:
  const results = await db.query({
    filter: (val, key) => key.startsWith("user"),
    sort: (a, b) => a.localeCompare(b),
    limit: 10,
    offset: 0,
    source: "db" // options: "db", "cache", or "history"
  });
  console.log("Query results:", results);

  // List all keys in the database
  const keys = await db.keys();
  console.log("Keys:", keys);

  // Retrieve all values from the database
  const values = await db.values();
  console.log("Values:", values);
})();

```


# API Documentation

## Constructor
``new UltraDB(dbName, customDBKey, doEnableHistory = false)``

- dbName: String
> The name of your database. The database file will be named <dbName>.udb.

- customDBKey: String (Optional)
> A custom key used for encryption. If not provided, a default key is used (a warning is issued).

- doEnableHistory: Boolean (Optional)
> Enable in-memory history logging of operations. Default is false.

## Methods
``load()``
Initializes and loads the database. Returns a promise that resolves once the database is ready.

``set(key, value)``
Stores a key-value pair in the database.

- ``key:`` String – A non-empty key.
- ``value:`` Any serializable value (can be an object).

``get(key)``
Retrieves the value associated with a key. Returns the value or undefined if not found.

``delete(key)``
Deletes the record for a given key. Returns true if successful, otherwise null.

``keys()``
Returns an array of all keys stored in the database.

``values()``
Returns an array of all values stored in the database.

``query(options)``
Executes an advanced query. Options include:

- ``filter: A function (value, key)`` => boolean to filter results.
- ``sort: A function (a, b, keyA, keyB)`` => number for sorting.
- ``limit:`` Maximum number of records to return.
- ``offset:`` Number of records to skip.
- ``source:`` Data source; one of ``"db"``, ``"cache"``, or ``"history"`` (default is ``"db"``).

## History Methods (when enabled)
``enableHistory():`` Enables history logging.

``disableHistory():`` Disables history logging and clears the history.

``getHistory():``Retrieves the current history log.

``clearHistory():`` Clears the history log.



# License
- UltraDB is distributed under the UltraDB License Agreement. Please refer to the LICENSE file for the full license details.

> Important: You may use UltraDB in your projects; however, you are not permitted to modify, decompile, reverse-engineer, or republish its source code as a standalone product.


# Contributing
Contributions are welcome! If you wish to contribute:

1. Fork the repository.

2. Make sure your changes do not violate the license terms.

3. Submit a pull request with detailed explanations of your modifications.

# Support
For questions or support, please contact:

Email: cor.et.noreply@gmail.com
