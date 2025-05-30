const pg = require('pg');
const { Pool, types } = pg;

// Use PostgreSQL environment variables
const pool = new Pool({
    host: process.env.PGHOST,
    port: process.env.PGPORT ? parseInt(process.env.PGPORT, 10) : 5432,
    user: process.env.PGUSER,
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE,
    ssl: process.env.PGSSLMODE === 'require' ? true : false,
    // Connection settings for reliability in containerized environments
    connectionTimeoutMillis: 5000, // 5 seconds
    idleTimeoutMillis: 30000, // 30 seconds
    max: 20 // Maximum number of clients in the pool
});

// Log connection status
pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle PostgreSQL client', err);
});

// Initial connection test with retries for Docker container startup sequence
(async () => {
    let retries = 5;
    while (retries) {
        try {
            const client = await pool.connect();
            console.log('Successfully connected to PostgreSQL');

            const textArrayOID = (
                await client.query("SELECT typarray FROM pg_type WHERE typname = 'text'")
            ).rows[0].typarray;

            const enumOIDs = (
                await client.query("SELECT typname, typarray FROM pg_type WHERE typtype = 'e'")
            ).rows;

            const arrayTextParser = pg.types.getTypeParser(textArrayOID);

            enumOIDs.forEach(({ typname, typarray }) => {
                const parser =
                    {
                        // Parsers for specific types can be set up here, for example:
                        // topic_tags: value => arrayTextParser(value).map(s => s.toLowerCase()),
                    }[typname] || arrayTextParser;

                pg.types.setTypeParser(typarray, parser);
            });

            client.release();
            break;
        } catch (err) {
            console.error(Database connection attempt failed (${retries} retries left): ${err.message});
            retries -= 1;
            if (retries === 0) {
                console.error('Maximum retries reached. Unable to connect to database.');
                // Don't exit the process, let the application handle missing DB gracefully
            }
            // Wait 5 seconds before next retry
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
})();

module.exports = { pool };