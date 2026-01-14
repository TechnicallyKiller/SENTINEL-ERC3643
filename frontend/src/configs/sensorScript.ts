export const SENSOR_SOURCE_CODE = `
// ---------------------------------------------------------
// CHAINLINK FUNCTIONS SCRIPT (Runs on Decentralized Network)
// ---------------------------------------------------------

// 1. Parse Arguments
// We pass the "Sensor ID" from our Frontend -> Smart Contract -> Here
const sensorId = args[0];

// 2. Simulate Sensor Reading
// In a real app, we would fetch from an API: await Functions.makeHttpRequest({ url: ... })
// For the Portfolio Demo, we simulate logic based on the ID.

let temperature = 4; // Default safe temp (4°C)
let isDanger = 0;    // 0 = Safe, 1 = Danger

if (sensorId.endsWith("99")) {
    // SIMULATE CRITICAL FAILURE
    temperature = 50; 
    isDanger = 1;
    console.log(\`🚨 CRITICAL ALERT: Sensor \${sensorId} reports \${temperature}°C (Rat/Fire Detected)\`);
} else {
    // SIMULATE NORMAL CONDITION
    console.log(\`✅ STATUS NORMAL: Sensor \${sensorId} reports \${temperature}°C\`);
}

// 3. Return Result to Blockchain
// We must return a Buffer representing the uint256 value (0 or 1)
return Functions.encodeUint256(BigInt(isDanger));
`;