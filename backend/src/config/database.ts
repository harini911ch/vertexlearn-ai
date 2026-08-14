import { Pool } from "pg";

const dbConfig = {
  host: "127.0.0.1",
  port: 5432,
  user: "vertexlearn",
  password: "vertexlearn_dev",
  database: "vertexlearn",
};

console.log("Database config:");
console.log("Host:", dbConfig.host);
console.log("Port:", dbConfig.port);
console.log("User:", dbConfig.user);
console.log("Database:", dbConfig.database);
console.log("Password length:", dbConfig.password.length);

const pool = new Pool(dbConfig);

pool.query("SELECT NOW()")
  .then((result) => {
    console.log("PostgreSQL connected successfully!");
    console.log("Database time:", result.rows[0]);
  })
  .catch((error) => {
    console.error("PostgreSQL connection failed:", error);
  });

export default pool;