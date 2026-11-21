<?php

use App\Models\Delivery;
use App\Models\FundCluster;
use App\Models\Office;
use App\Models\PoInspectionEntry;
use App\Models\ServePo;
use App\Models\Supplier;
use App\Models\User;
use App\Services\DisbursementVoucherService;

it('formats amount to words exactly as required', function () {
    $service = new DisbursementVoucherService();

    expect($service->amountToWords(10336.81))
        ->toBe('TEN THOUSAND THREE HUNDRED THIRTY-SIX PESOS & 81/100 ONLY');

    expect($service->amountToWords(1.00))
        ->toBe('ONE PESO & 00/100 ONLY');

    expect($service->amountToWords(2.00))
        ->toBe('TWO PESOS & 00/100 ONLY');

    expect($service->amountToWords(1.05))
        ->toBe('ONE PESO & 05/100 ONLY');

    expect($service->amountToWords(50000.50))
        ->toBe('FIFTY THOUSAND PESOS & 50/100 ONLY');
});

it('blocks DV export when delivery record is missing, and allows when delivery record exists', function () {
    $user = User::factory()->create(['role' => 'admin']);

    $supplier = Supplier::create([
        'supplier_name' => 'Acme Supplies',
    ]);

    $office = Office::create([
        'office_code' => 'TEST01',
        'office_name' => 'Testing Office',
        'entity_name' => 'SMU',
    ]);

    $fund = FundCluster::create([
        'fund_cluster_id' => '01',
        'fund_description' => 'General Fund',
    ]);

    $po = ServePo::create([
        'po_number' => 'PO-2026-9999',
        'supplier_id' => $supplier->supplier_id,
        'unit_office' => $office->office_code,
        'fund_cluster_id' => $fund->fund_cluster_id,
        'po_date' => '2026-01-01',
        'total_amount_po' => 50000.00,
        'po_step' => 'Forwarded to Finance',
        'date_completed' => '2026-02-01',
        'dv_template' => 'neither',
    ]);

    // 1. No delivery record -> blocked
    $response = $this->actingAs($user)->get("/purchase-orders/{$po->po_number}/dv-eligibility");
    $response->assertJson([
        'eligible' => false,
        'has_delivery' => false,
    ]);

    // Also assert export endpoint itself throws 403 when requirements are unmet
    $exportBlocked = $this->actingAs($user)->get("/purchase-orders/{$po->po_number}/export-dv?template=neither");
    $exportBlocked->assertStatus(403);

    // Add delivery record
    Delivery::create([
        'delivery_id' => 'DEL-2026-001',
        'po_number' => $po->po_number,
        'supplier_id' => $supplier->supplier_id,
        'delivery_date' => '2026-01-15',
    ]);

    // 2. Delivery exists -> eligible (no inspection entries required)
    $response2 = $this->actingAs($user)->get("/purchase-orders/{$po->po_number}/dv-eligibility");
    $response2->assertJson([
        'eligible' => true,
        'has_delivery' => true,
    ]);

    // Assert export endpoint generates stream download
    $exportSuccess = $this->actingAs($user)->get("/purchase-orders/{$po->po_number}/export-dv?template=neither");
    $exportSuccess->assertSuccessful();
    expect($exportSuccess->headers->get('content-type'))
        ->toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});

it('generates disbursement voucher Excel spreadsheets with correct printed names, amount in words, and formulas for all templates', function () {
    $service = new DisbursementVoucherService();

    $supplier = Supplier::create([
        'supplier_name' => 'Test Supplier Inc',
        'address' => 'Davao City',
        'tin' => '123-456-789-000',
    ]);

    $office = Office::create([
        'office_code' => 'OF-TEST',
        'office_name' => 'Testing Office',
        'entity_name' => 'SMU',
    ]);

    $fund = FundCluster::create([
        'fund_cluster_id' => '05',
        'fund_description' => 'Trust Fund',
    ]);

    $po = ServePo::create([
        'po_number' => 'PO-EXCEL-TEST',
        'supplier_id' => $supplier->supplier_id,
        'unit_office' => $office->office_code,
        'fund_cluster_id' => $fund->fund_cluster_id,
        'po_date' => '2026-03-01',
        'total_amount_po' => 10336.81,
    ]);

    // 1. Neither template (Disbursement Voucher)
    $neitherSpreadsheet = $service->generateNeitherExcel($po);
    $neitherSheet = $neitherSpreadsheet->getActiveSheet();
    expect($neitherSheet->getCell('D52')->getValue())->toBe('ABIGAIL F. FRANCISCO');
    expect($neitherSheet->getCell('V52')->getValue())->toBe('MA. LUISA B. FAUNILLAN');
    // Net payable: 10,336.81 - tax (553.75) = 9,783.06
    expect($neitherSheet->getCell('R43')->getValue())->toBe('NINE THOUSAND SEVEN HUNDRED EIGHTY-THREE PESOS & 06/100 ONLY');
    expect($neitherSheet->getCell('AA18')->getValue())->toBe('=K26');
    expect(round($neitherSheet->getCell('AA18')->getCalculatedValue(), 2))->toBe(9783.06);

    // 2. LD only template
    $ldSpreadsheet = $service->generateLdOnlyExcel($po, 336.81);
    $ldSheet = $ldSpreadsheet->getActiveSheet();
    expect($ldSheet->getCell('D53')->getValue())->toBe('ABIGAIL F. FRANCISCO');
    expect($ldSheet->getCell('V53')->getValue())->toBe('MA. LUISA B. FAUNILLAN');
    // PO (10336.81) - LD (336.81) = 10000.00. Tax1 (89.29) + Tax5 (446.43) = 535.72. Final payable = 9464.28
    expect($ldSheet->getCell('R44')->getValue())->toBe('NINE THOUSAND FOUR HUNDRED SIXTY-FOUR PESOS & 28/100 ONLY');
    expect($ldSheet->getCell('AA18')->getValue())->toBe('=K27');
    expect(round($ldSheet->getCell('AA18')->getCalculatedValue(), 2))->toBe(9464.28);

    // 3. Retention only template
    $retentionSpreadsheet = $service->generateRetentionOnlyExcel($po, 103.37);
    $retSheet = $retentionSpreadsheet->getActiveSheet();
    expect($retSheet->getCell('D53')->getValue())->toBe('ABIGAIL F. FRANCISCO');
    expect($retSheet->getCell('V53')->getValue())->toBe('MA. LUISA B. FAUNILLAN');
    expect($retSheet->getCell('R44')->getValue())->toContain('PESOS');
    expect($retSheet->getCell('R44')->getValue())->toContain('/100 ONLY');
    expect($retSheet->getCell('AA18')->getValue())->toBe('=K27');
    expect($retSheet->getCell('AA18')->getCalculatedValue())->toBeGreaterThan(0);
});
