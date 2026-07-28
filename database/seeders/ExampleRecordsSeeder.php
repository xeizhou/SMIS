<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use App\Models\ServePo;
use App\Models\Delivery;
use App\Models\PoLetterMonitoring;
use App\Models\PirMonitoring;
use App\Models\EmployeeFileLocator;
use App\Models\StockItem;
use App\Models\RegspiMonitoring;
use App\Models\RrppeMonitoring;
use App\Models\ItrPtrMonitoring;
use App\Models\BonaVidaMonitoring;

class ExampleRecordsSeeder extends Seeder
{
    public function run(): void
    {
        $unit = \App\Models\Unit::firstOrCreate(
            ['unit_name' => 'Pieces'],
            ['unit_short_name' => 'pcs']
        );

        $fundCluster = \App\Models\FundCluster::firstOrCreate(
            ['fund_cluster_id' => 'FC-01'],
            ['fund_description' => 'General Fund']
        );

        // 1. Personnel Files (EmployeeFileLocator)
        EmployeeFileLocator::firstOrCreate([
            'last_name' => 'Dela Cruz',
            'first_name' => 'Juan',
            'middle_name' => 'Gomez',
            'area' => 'IT Department',
            'status' => 'Active'
        ]);

        // 2. Stock Cards (StockItem)
        StockItem::firstOrCreate(
            ['stock_no' => 'STK-2024-001'],
            [
                'item_name' => 'A4 Bond Paper',
                'description' => 'Substance 20 A4 Bond Paper',
                'unitID' => $unit->getKey(),
                'on_hand_quantity' => 50,
                're_order_point' => 10,
                'fund_cluster_id' => $fundCluster->getKey(),
                'link' => null,
                'remarks' => 'Regular supply'
            ]
        );

        // 3. Assets (Property Monitoring)
        RegspiMonitoring::firstOrCreate(
            ['ics_no' => 'ICS-2024-001'],
            [
                'month_year' => '2024-08',
                'semi_expendable_property_no' => 'SEP-001',
                'item_description' => 'Office Chair',
                'estimated_useful_life' => 5,
                'issued_qty' => 10,
                'issued_office_officer' => 'Admin Office',
                'balance_qty' => 10,
                'amount' => 2500,
                'fund_cluster_id' => $fundCluster->getKey()
            ]
        );

        RrppeMonitoring::firstOrCreate(
            ['rrppe_no' => 'RRPPE-001'],
            [
                'date_received' => '2024-08-01',
                'item_description' => 'MacBook Pro',
                'quantity' => 2,
                'property_no' => 'PROP-MAC-01',
                'end_user_name' => 'Juan Dela Cruz',
                'cost' => 85000,
                'status' => 'Good Condition',
                'area' => 'IT Department',
            ]
        );

        ItrPtrMonitoring::firstOrCreate(
            ['transaction_no' => 'PTR-001'],
            [
                'date_release' => '2024-08-05',
                'claimed_by' => 'Maria Santos',
                'from_accountable_officer' => 'Juan Dela Cruz',
                'to_accountable_officer' => 'Maria Santos',
                'property_no' => 'PROP-MAC-01',
                'description' => 'MacBook Pro Transfer',
                'amount' => 85000,
                'condition_of_ppe' => 'Good',
                'location' => 'Main Office',
                'date_received' => '2024-08-06'
            ]
        );

        $office = \App\Models\Office::firstOrCreate(
            ['office_code' => 'OFC-BV-01'],
            [
                'office_name' => 'Main Office',
                'entity_name' => 'Main Entity',
                'office_head' => 'John Doe'
            ]
        );

        BonaVidaMonitoring::firstOrCreate(
            ['invoice_no' => 'INV-BV-1002'],
            [
                'date_received' => '2024-08-10',
                'office_code' => $office->getKey(),
                'qty' => 5,
                'price' => 1000,
                'total_amount' => 5000,
                'invoice_date' => '2024-08-09',
                'remarks' => 'Initial delivery'
            ]
        );

        // 4. Procurement (using factories)
        $purchaseOrder = ServePo::factory()->create([
            'po_number' => 'PO-2024-1001',
            'item_description' => 'Office Supplies Batch 1'
        ]);

        Delivery::factory()->forServePo($purchaseOrder)->create([
            'delivery_date' => '2024-08-15'
        ]);

        PoLetterMonitoring::factory()->forServePo($purchaseOrder)->create([
            'type_of_letter' => 'Notice to Proceed'
        ]);

        PirMonitoring::factory()->forServePo($purchaseOrder)->create();
    }
}
