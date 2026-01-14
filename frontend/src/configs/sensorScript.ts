export const SENSOR_SOURCE_CODE = `
const sensorId = args[0];

if (sensorId === "sensor-99") {
  // PROBLEM: Solidity checks the FIRST byte: response[0] == 1
  // SOLUTION: We shift the number '1' left by 248 bits to put it at the front.
  // 1 << 248 = 0x0100000000000000... (32 bytes total)
  
  const val = BigInt(1) << BigInt(248);
  
  return Functions.encodeUint256(val);
} else {
  return Functions.encodeUint256(0n);
}
`;