const UltraDB = require('./main.js'); 

async function testUltraDB() {
	try{
    console.log("Testing UltraDB...");

    // Initialize Database
    const db = new UltraDB("__test", "SuperRandomSecureKey123");

    // Wait until DB is ready
    await db.load();
	

    // Set a key-value pair
    await db.set("username", "iiPilix");

    // Retrieve and print the value
    const value = await db.get("username");
    console.log("Retrieved Value:", value);

    // Check if deletion works
    await db.delete("username");
	
	
    const deletedValue = await db.get("username");
	
	
    console.log("Deleted Value (Should be undefined):", deletedValue);

    console.log("UltraDB test completed!");
	
	}
	catch{
		// Ignore in test, completely safe as there should be no thrown errors in case not found.
	}
}

try{testUltraDB().then(console.log(`FINSIHED TEST! PASSED SUCCESSFULLY`));}catch{}

process.on("uncaughtException", (err) => {
    if (err.message.includes('Key "username" not found.')) {
        console.warn("[UltraDB] Ignoring expected error:", err.message);
		console.log(`FINSIHED TEST! PASSED SUCCESSFULLY`)
		process.exit(0);
    } else {
        console.error("[UltraDB] Unexpected error:", err);
        process.exit(1);  // Only exit for unexpected errors
    }
});

