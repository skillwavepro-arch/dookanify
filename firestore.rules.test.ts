import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('firestore.rules enforces all 8 Pillars of Hardened Rules including shops collection', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf8');

  // Pillar 1: Global default deny catch-all
  assert.ok(rules.includes('match /{document=**}'));
  assert.ok(rules.includes('allow read, write: if false;'));

  // Pillar 2: Validation Blueprints for all 5 collections
  assert.ok(rules.includes('function isValidShopProfile(data)'));
  assert.ok(rules.includes('function isValidProduct(data)'));
  assert.ok(rules.includes('function isValidCustomer(data)'));
  assert.ok(rules.includes('function isValidSale(data)'));
  assert.ok(rules.includes('function isValidExpense(data)'));

  // Pillar 3: Path Variable Hardening
  assert.ok(rules.includes('function isValidId(id)'));
  assert.ok(rules.includes('isValidId(shopId)'));
  assert.ok(rules.includes('isValidId(productId)'));
  assert.ok(rules.includes('isValidId(customerId)'));
  assert.ok(rules.includes('isValidId(saleId)'));
  assert.ok(rules.includes('isValidId(expenseId)'));

  // Pillar 4 & 5: Strict keys & Action-based updates with affectedKeys().hasOnly()
  assert.ok(rules.includes('data.keys().hasAll('));
  assert.ok(rules.includes('data.keys().hasOnly('));
  assert.ok(rules.includes('incoming().diff(existing()).affectedKeys().hasOnly('));

  // Pillar 6 & 8: Tenant isolation on get and list (Query Enforcer)
  assert.ok(rules.includes('allow list: if isSignedIn() && existing().ownerId == request.auth.uid;'));

  // Verified user check and temporal integrity
  assert.ok(rules.includes('request.auth.token.email_verified == true'));
  assert.ok(rules.includes('incoming().createdAt == request.time'));
  assert.ok(rules.includes('incoming().updatedAt == request.time'));
});
