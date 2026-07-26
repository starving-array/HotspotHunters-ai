/**
 * Fetches data from a public API endpoint using native fetch, parses it as JSON,
 * and processes the results asynchronously.
 *
 * @param url The URL of the public API endpoint.
 */
async function fetchAndProcessData(url: string): Promise<void> {
    console.log(\`[INFO] Starting data fetch from: \${url}\`);

    try {
        // Step 1: Fetch data using native JavaScript fetch
        const response = await fetch(url);

        // Check if the HTTP status code indicates success (200-299)
        if (!response.ok) {
            throw new Error(\`HTTP error! Status: \${response.status} - \${response.statusText}\`);
        }

        console.log('[INFO] Data fetched successfully. Parsing JSON...');

        // Step 2: Parse the response body as JSON
        const data = await response.json();

        // --- Example Processing Logic ---
        // Assuming 'data' is an array of objects, e.g., user profiles.
        if (Array.isArray(data)) {
            console.log(`[INFO] Successfully received an array of ${data.length} records.`);

            // Simple processing example: calculate the sum of a numeric field
            // or log key details. We will assume each object has an 'id' and 'name'.
            let totalItems = data.reduce((acc, item) => {
                // Safety check for required fields before accessing them
                if (item && typeof item.someMetric === 'number') {
                    return acc + item.someMetric;
                }
                return acc;
            }, 0);

            console.log(`[RESULT] Total aggregated metric sum: ${totalItems}`);

        } else if (typeof data === 'object' && data !== null) {
             // Handling non-array object structure
            console.log('[RESULT] Data is a single object.');
            Object.keys(data).forEach(key => {
                console.log(` - Key found: ${key}`);
            });
        } else {
            console.warn('[WARN] Fetched data format is neither an array nor a standard object.');
        }

    } catch (error) {
        // Handle network errors, JSON parsing errors, or custom thrown errors
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[ERROR] Failed to fetch or process data: ${message}`);
        // Re-throw the error if calling context needs to know it failed
        // throw new Error(\`Data processing failed.\`);
    } finally {
        console.log('[INFO] Data fetching and processing complete.');
    }
}

// --- Usage Example ---
// NOTE: Replace this URL with your actual public API endpoint.
// We use JSONPlaceholder as a reliable, mock API for demonstration purposes.
const API_URL = 'https://jsonplaceholder.typicode.com/users';

/**
 * Main execution function to demonstrate the workflow.
 */
async function main() {
    await fetchAndProcessData(API_URL);
}

// Execute the main function
main();

// To run this file, save it and execute using: ts-node your_file_name.ts
