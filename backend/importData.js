const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse'); // Import the parse function from csv-parse
const moment = require('moment'); // For date parsing

// Load environment variables from .env file
// The .env file is expected to be in the same directory as this script.
require('dotenv').config();

// --- Database Connection & Mongoose Schema ---
// Access the MONGO_URI from environment variables (case-sensitive)
const MONGO_URI = process.env.MONGO_URI;

// Define the Mongoose Schema for Equipment
const EquipmentSchema = new mongoose.Schema({
    assetId: { type: String, required: true, unique: true },
    category: { type: String, required: true },
    status: { type: String, required: true, enum: ['In Use', 'In Stock', 'Damaged', 'E-Waste'] },
    model: { type: String, default: null },
    serialNumber: { type: String, default: null },
    warrantyInfo: { type: String, default: null }, // Storing as String (YYYY-MM-DD format)
    location: { type: String, default: null },
    comment: { type: String, default: null },
    assigneeName: { type: String, default: null },
    position: { type: String, default: null },
    employeeEmail: { type: String, default: null },
    phoneNumber: { type: String, default: null },
    department: { type: String, default: null },
    damageDescription: { type: String, default: null },
    purchasePrice: { type: Number, default: 0 },
    isDeleted: {
        type: Boolean,
        default: false
    }
}, { timestamps: true }); // Mongoose will add createdAt and updatedAt fields

// Create the Mongoose Model
const Equipment = mongoose.model('Equipment', EquipmentSchema);

// --- Path to your CSV file ---
// This path now correctly assumes the CSV is in the same directory as this script.
const csvFilePath = path.join(__dirname, 'cleaned_equipment_data.csv');

// --- Import Function ---
const importData = async () => {
    try {
        // 1. Connect to MongoDB
        if (!MONGO_URI) {
            console.error('Error: MONGO_URI is not defined in your .env file.');
            return; // Exit if URI is missing
        }
        await mongoose.connect(MONGO_URI);
        console.log('MongoDB connected for import script.');

        // 2. Optional: Clear existing data before import (USE WITH CAUTION!)
        // Uncomment the lines below if you want to delete all existing Equipment documents
        // before importing new data. This is useful for fresh imports but will
        // permanently remove existing data.
        // await Equipment.deleteMany({});
        // console.log('Existing equipment data cleared.');

        const records = [];
        // 3. Create a readable stream from the CSV file and pipe it to csv-parse
        const parser = fs.createReadStream(csvFilePath)
            .pipe(parse({
                columns: true,      // Treat the first row as column headers
                skip_empty_lines: true, // Skip any completely empty rows
                trim: true          // Trim whitespace from beginning/end of values
            }));

        // 4. Process each record from the CSV stream
        for await (const record of parser) {
            // Transform each record to match your Mongoose schema fields
            // Handle potential missing data with defaults or null
            const transformedRecord = {
                assetId: record['Asset ID'] || `AUTO-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                category: record['Category'] || 'Uncategorized',
                status: record['Status'] || 'In Stock', // Default status if not provided
                model: record['Model'] || null,
                serialNumber: record['Serial Number'] || null,
                // Assuming 'Expiry Date' from CSV should go into 'warrantyInfo' field as a string
                warrantyInfo: record['Expiry Date'] ? moment(record['Expiry Date']).format('YYYY-MM-DD') : null,
                location: record['Location'] || null,
                comment: record['Comment'] || null,
                assigneeName: record['Assignee Name'] || null,
                position: record['Position'] || null,
                employeeEmail: record['Employee Email'] || null,
                phoneNumber: record['Phone Number'] || null,
                department: record['Department'] || null,
                damageDescription: record['Damage Description'] || null,
                // Parse purchasePrice as a number, default to 0 if invalid or missing
                purchasePrice: parseFloat(record['Purchase Price']) || 0,
                // Convert string 'TRUE' from CSV to boolean true, otherwise false
                isDeleted: record['isDeleted'] && record['isDeleted'].toUpperCase() === 'TRUE' // Robust check for 'TRUE'
            };

            // Basic validation for critical required fields before attempting to save
            // This prevents Mongoose validation errors for basic requirements
            if (!transformedRecord.assetId || !transformedRecord.category || !transformedRecord.status) {
                console.warn('Skipping record due to missing required fields (assetId, category, or status):', record);
                continue; // Skip to the next record
            }

            records.push(transformedRecord);
        }

        console.log(`Parsed ${records.length} records from CSV.`);

        // 5. Insert data into MongoDB
        // Using individual save operations for detailed logging and duplicate checking.
        // For very large datasets, consider using `insertMany` after filtering out duplicates,
        // or `bulkWrite` with `upsert: true` for upserting records.
        for (const data of records) {
            try {
                // Check if an asset with the same assetId already exists
                const existingAsset = await Equipment.findOne({ assetId: data.assetId });

                if (existingAsset) {
                    // If asset exists, log and skip (or uncomment update logic if desired)
                    console.log(`Skipping existing asset (duplicate assetId): ${data.assetId}`);
                    // Example of updating existing instead of skipping:
                    // await Equipment.findOneAndUpdate({ assetId: data.assetId }, data, { new: true });
                    // console.log(`Updated existing asset: ${data.assetId}`);
                } else {
                    // If asset does not exist, create and save a new document
                    const newEquipment = new Equipment(data);
                    await newEquipment.save();
                    console.log(`Successfully imported new asset: ${data.assetId}`);
                }
            } catch (saveError) {
                // Handle potential errors during save (e.g., Mongoose validation errors)
                console.error(`Error importing asset ${data.assetId}:`, saveError.message);
                // Specifically catch MongoDB duplicate key errors (code 11000)
                if (saveError.code === 11000) {
                    console.error(`Duplicate key error (assetId): ${data.assetId}. This usually means the assetId already exists.`);
                }
            }
        }

        console.log('Data import complete!');

    } catch (err) {
        // Catch errors from connection, file reading, or parsing
        console.error('An unhandled error occurred during data import:', err);
    } finally {
        // Ensure MongoDB connection is closed regardless of success or failure
        if (mongoose.connection.readyState === 1) { // Check if connected
            await mongoose.disconnect();
            console.log('MongoDB disconnected.');
        } else {
            console.log('MongoDB was not connected or already disconnected.');
        }
    }
};

// Call the import function to start the process
importData();