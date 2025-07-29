import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

// Type declaration for global.mongoose
declare global {
  var mongoose:
    | {
        conn: typeof import("mongoose") | null;
        promise: Promise<typeof import("mongoose")> | null;
      }
    | undefined;
}

// Type-safe assignment
if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null };
}

const cached = global.mongoose; // ✅ TS now knows cached is not undefined

async function mongoConnect() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { dbName: "exams" })
      .then((mongoose) => mongoose);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default mongoConnect;
