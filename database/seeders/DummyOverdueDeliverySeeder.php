<?php
namespace Database\Seeders;
use Illuminate\Database\Seeder;
use App\Models\Supplier;
use App\Models\ServePo;
use App\Models\Delivery;

class DummyOverdueDeliverySeeder extends Seeder
{
    public function run()
    {
        $supplier = Supplier::firstOrCreate(
            ['supplier_name' => 'Acme Test Corp 1' . rand(1, 1000)],
            [
                'contact_person' => 'Aize Test 1',
                'email_address' => 'aizevirtudazo@gmail.com'
            ]
        );

        $po = ServePo::create([
            'po_number' => 'PO-TEST-' . rand(1000, 9999),
            'supplier_id' => $supplier->supplier_id,
            'po_received_date' => now()->subDays(15)->format('Y-m-d'),
            'delivery_term' => 15,
        ]);

        Delivery::create([
            'delivery_id' => 'DEL-' . rand(1000, 9999),
            'po_number' => $po->po_number,
            'supplier_id' => $supplier->supplier_id,
            'status' => 'PENDING'
        ]);
        
        echo "Successfully seeded dummy overdue delivery!\n";

        $this->run1();
        $this->run2();
    }

    public function run1()
    {
        $supplier = Supplier::firstOrCreate(
            ['supplier_name' => 'Acme Test Corp 2' . rand(1, 1000)],
            [
                'contact_person' => 'Aize Test 2',
                'email_address' => 'aizevirtudazo@gmail.com'
            ]
        );

        $po = ServePo::create([
            'po_number' => 'PO-TEST-' . rand(1000, 9999),
            'supplier_id' => $supplier->supplier_id,
            'po_received_date' => now()->subDays(15)->format('Y-m-d'),
            'delivery_term' => 15,
        ]);

        Delivery::create([
            'delivery_id' => 'DEL-' . rand(1000, 9999),
            'po_number' => $po->po_number,
            'supplier_id' => $supplier->supplier_id,
            'status' => 'PARTIAL'
        ]);
        
        echo "Successfully seeded dummy overdue delivery!\n";
    }

    public function run2()
    {
        $supplier = Supplier::firstOrCreate(
            ['supplier_name' => 'Acme Test Corp 3' . rand(1, 1000)],
            [
                'contact_person' => 'Aize Test 3',
                'email_address' => 'aizevirtudazo@gmail.com'
            ]
        );

        $po = ServePo::create([
            'po_number' => 'PO-TEST-' . rand(1000, 9999),
            'supplier_id' => $supplier->supplier_id,
            'po_received_date' => now()->subDays(15)->format('Y-m-d'),
            'delivery_term' => 15,
        ]);

        Delivery::create([
            'delivery_id' => 'DEL-' . rand(1000, 9999),
            'po_number' => $po->po_number,
            'supplier_id' => $supplier->supplier_id,
            'status' => 'COMPLETED'
        ]);
        
        echo "Successfully seeded dummy overdue delivery!\n";
    }
}
