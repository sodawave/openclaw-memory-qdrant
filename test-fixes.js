/**
 * Self-validation tests - v1.0.11 PII protection verification
 *
 * Issues fixed and tested:
 * - PII protection: remove PII patterns from auto-capture triggers
 * - containsPII() correctly detects emails and phone numbers
 * - detectCategory no longer uses PII patterns
 */

import { shouldCapture, detectCategory, sanitizeInput, containsPII } from './index.js';

// ============================================================================
// Test utilities
// ============================================================================

let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    testsFailed++;
  }
}

function assertEquals(actual, expected, message) {
  if (actual === expected) {
    console.log(`✅ PASS: ${message}`);
    testsPassed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    console.error(`  Expected: ${expected}`);
    console.error(`  Actual: ${actual}`);
    testsFailed++;
  }
}

// ============================================================================
// Test suite
// ============================================================================

console.log('\n🧪 Starting self-validation tests...\n');

// Test 1: sanitizeInput - HTML tag sanitization
console.log('📋 Test group 1: Input sanitization (sanitizeInput)');
{
  const input1 = '<script>alert("xss")</script>Hello';
  const result1 = sanitizeInput(input1);
  assert(!result1.includes('<script>'), 'should remove script tags');
  assertEquals(result1, 'alert("xss")Hello', 'should keep only text content');

  const input2 = '<b>Bold</b> and <i>italic</i>';
  const result2 = sanitizeInput(input2);
  assertEquals(result2, 'Bold and italic', 'should remove all HTML tags');

  const input3 = 'Normal text';
  const result3 = sanitizeInput(input3);
  assertEquals(result3, 'Normal text', 'plain text should remain unchanged');

  const input4 = '  Multiple   spaces  ';
  const result4 = sanitizeInput(input4);
  assertEquals(result4, 'Multiple spaces', 'should normalize whitespace');

  const input5 = 'Line1\x00\x01\x02Line2';
  const result5 = sanitizeInput(input5);
  assert(!result5.includes('\x00'), 'should remove control characters');
  assertEquals(result5, 'Line1Line2', 'should remove control characters but keep text');
}

// Test 2: detectCategory - no longer uses PII patterns
console.log('\n📋 Test group 2: Category detection (detectCategory - no PII patterns)');
{
  // Test phone numbers (should not be recognized as entity)
  const phone1 = '+1234567890';  // 10 digits
  const cat1 = detectCategory(phone1);
  assert(cat1 !== 'entity', 'phone numbers should not be auto-recognized as entity');

  const phone2 = '+12345678901234';  // 14 digits
  const cat2 = detectCategory(phone2);
  assert(cat2 !== 'entity', 'overly long phone numbers should not be recognized as entity');

  // Test emails (should not be recognized as entity)
  const email1 = 'test@example.com';
  const cat3 = detectCategory(email1);
  assert(cat3 !== 'entity', 'emails should not be auto-recognized as entity');

  const email2 = 'invalid@';
  const cat4 = detectCategory(email2);
  assert(cat4 !== 'entity', 'invalid emails should not be recognized as entity');

  // Test preferences
  const pref1 = 'I prefer using TypeScript';
  const cat5 = detectCategory(pref1);
  assertEquals(cat5, 'preference', 'preference statement should be recognized as preference');

  // Test decisions
  const decision1 = 'We decided to use React';
  const cat6 = detectCategory(decision1);
  assertEquals(cat6, 'decision', 'decision statement should be recognized as decision');
}

// Test 2.5: containsPII - PII detection
console.log('\n📋 Test group 2.5: PII detection (containsPII)');
{
  // Test email detection
  const email1 = 'test@example.com';
  assert(containsPII(email1), 'should detect email');

  const email2 = 'My email is user@domain.org';
  assert(containsPII(email2), 'should detect email within text');

  const noEmail = 'No email here';
  assert(!containsPII(noEmail), 'should not false-positive on email');

  // Test phone number detection
  const phone1 = '+1234567890';
  assert(containsPII(phone1), 'should detect 10-digit phone number');

  const phone2 = '+12345678901';
  assert(containsPII(phone2), 'should detect 11-digit phone number');

  const phone3 = '+123456789012';
  assert(containsPII(phone3), 'should detect 12-digit phone number');

  const phone4 = '+1234567890123';
  assert(containsPII(phone4), 'should detect 13-digit phone number');

  const phone5 = '+12345678901234';
  assert(!containsPII(phone5), 'should not detect 14-digit phone number (out of range)');

  const noPhone = 'No phone here';
  assert(!containsPII(noPhone), 'should not false-positive on phone number');
}

// Test 3: shouldCapture - no longer triggers PII capture
console.log('\n📋 Test group 3: Capture filtering (shouldCapture - no PII trigger)');
{
  // shouldCapture no longer checks PII, only semantic triggers
  // PII check is handled by containsPII and autoCapture logic

  const email1 = 'My email is test@example.com';
  const result1 = shouldCapture(email1);
  const hasPII1 = containsPII(email1);
  assert(result1 && hasPII1, 'text containing email triggers capture, but should be intercepted by PII check');

  const phone1 = 'Call me at +1234567890';
  const result2 = shouldCapture(phone1);
  const hasPII2 = containsPII(phone1);
  assert(!result2 || hasPII2, 'if text containing phone number triggers capture, it should be intercepted by PII check');

  const remember1 = 'Remember to buy milk';
  const result3 = shouldCapture(remember1);
  const hasPII3 = containsPII(remember1);
  assert(result3 && !hasPII3, 'text with remember keyword and no PII should be captured');

  const prefer1 = 'I prefer dark mode';
  const result4 = shouldCapture(prefer1);
  const hasPII4 = containsPII(prefer1);
  assert(result4 && !hasPII4, 'text with prefer keyword and no PII should be captured');

  const short1 = 'Hi';
  const result5 = shouldCapture(short1);
  assert(!result5, 'text too short should not be captured');

  const long1 = 'a'.repeat(1000);
  const result6 = shouldCapture(long1, 500);
  assert(!result6, 'text too long should not be captured');
}

// Test 4: ReDoS protection
console.log('\n📋 Test group 4: ReDoS protection');
{
  // Test inputs that may cause ReDoS
  const malicious1 = '+' + '1'.repeat(100);  // overly long phone number
  const start1 = Date.now();
  const cat1 = detectCategory(malicious1);
  const duration1 = Date.now() - start1;
  assert(duration1 < 100, `overly long phone number should be processed quickly (${duration1}ms)`);

  const malicious2 = 'a'.repeat(100) + '@' + 'b'.repeat(100) + '.' + 'c'.repeat(100);
  const start2 = Date.now();
  const result2 = shouldCapture(malicious2);
  const duration2 = Date.now() - start2;
  assert(duration2 < 100, `complex email pattern should be processed quickly (${duration2}ms)`);
}

// Test 5: Edge cases
console.log('\n📋 Test group 5: Edge cases');
{
  // null/undefined input
  const result1 = sanitizeInput(null);
  assertEquals(result1, '', 'null should return empty string');

  const result2 = sanitizeInput(undefined);
  assertEquals(result2, '', 'undefined should return empty string');

  const result3 = sanitizeInput('');
  assertEquals(result3, '', 'empty string should return empty string');

  // non-string input
  const result4 = sanitizeInput(123);
  assertEquals(result4, '', 'number should return empty string');

  const result5 = sanitizeInput({});
  assertEquals(result5, '', 'object should return empty string');
}

// Test 6: Chinese language support
console.log('\n📋 Test group 6: Chinese language support');
{
  const chinese1 = '记住这个重要信息';
  const result1 = shouldCapture(chinese1);
  assert(result1, 'Chinese "remember" keyword should be captured');

  const chinese2 = '我喜欢用 TypeScript';
  const cat1 = detectCategory(chinese2);
  assertEquals(cat1, 'preference', 'Chinese preference should be recognized');

  const chinese3 = '我决定使用 React';
  const cat2 = detectCategory(chinese3);
  assertEquals(cat2, 'decision', 'Chinese decision should be recognized');

  const chinese4 = '<b>粗体</b>文本';
  const result2 = sanitizeInput(chinese4);
  assertEquals(result2, '粗体文本', 'Chinese text should correctly sanitize HTML');
}

// ============================================================================
// Test results
// ============================================================================

console.log('\n' + '='.repeat(60));
console.log('📊 Test results summary');
console.log('='.repeat(60));
console.log(`✅ Passed: ${testsPassed}`);
console.log(`❌ Failed: ${testsFailed}`);
console.log(`📈 Pass rate: ${((testsPassed / (testsPassed + testsFailed)) * 100).toFixed(1)}%`);
console.log('='.repeat(60));

if (testsFailed === 0) {
  console.log('\n🎉 All tests passed! Code fix verification successful.\n');
  process.exit(0);
} else {
  console.log('\n⚠️  Some tests failed, please check the code.\n');
  process.exit(1);
}
