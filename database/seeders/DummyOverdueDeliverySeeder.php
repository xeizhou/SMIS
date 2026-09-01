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
            ['supplier_name' => 'Acme Test Corp ' . rand(1, 1000)],
            [
                'contact_person' => 'Aize Test',
                'email_address' => 'aizevirtudazo@gmail.com'
            ]
        );

        $po = ServePo::create([
            'po_number' => 'PO-TEST-' . rand(1000, 9999),
            'supplier_id' => $supplier->supplier_id,
            'po_received_date' => now()->subDays(11)->format('Y-m-d'),
            'delivery_term' => 10,
        ]);

        Delivery::create([
            'delivery_id' => 'DEL-' . rand(1000, 9999),
            'po_number' => $po->po_number,
            'supplier_id' => $supplier->supplier_id,
            'status' => 'PENDING'
        ]);
        
        echo "Successfully seeded dummy overdue delivery!\n";
    }
}
