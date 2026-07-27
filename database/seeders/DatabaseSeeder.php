<?php

namespace Database\Seeders;

use App\Models\Delivery;
use App\Models\FundCluster;
use App\Models\Office;
use App\Models\PirMonitoring;
use App\Models\PoLetterMonitoring;
use App\Models\ServePo;
use App\Models\Supplier;
use App\Models\Unit;
use App\Models\StockItem;
use App\Models\Transaction;
use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate([
            'email' => 'admin@gmail.com',
        ], [
            'name' => 'admin',
            'password' => Hash::make('12345678'),
            'role' => 'admin',
        ]);

        // Order matters — parents before children. Create only when empty to be idempotent.
        if (FundCluster::count() === 0) {
            $fundClusters = FundCluster::factory(5)->create();
        } else {
            $fundClusters = FundCluster::all();
        }

        if (Office::count() === 0) {
            $offices = Office::factory(8)->create();
        } else {
            $offices = Office::all();
        }

        if (Supplier::count() === 0) {
            $suppliers = Supplier::factory(10)->create();
        } else {
            $suppliers = Supplier::all();
        }

        // Units, stock items and transactions (parents before children)
        if (Unit::count() === 0) {
            $units = Unit::factory(8)->create();
        } else {
            $units = Unit::all();
        }

        if (StockItem::count() === 0) {
            $stockItems = StockItem::factory(50)->create();
        } else {
            $stockItems = StockItem::all();
        }

        if (Transaction::count() === 0) {
            $transactions = Transaction::factory(200)->create();
        } else {
            $transactions = Transaction::all();
        }

        if (ServePo::count() === 0) {
            $purchaseOrders = ServePo::factory(30)->create();
        } else {
            $purchaseOrders = ServePo::all();
        }

        $purchaseOrders->each(function (ServePo $po) {
            Delivery::factory(rand(1, 2))->forServePo($po)->create();

            $letterTypes = collect(['Notice to Proceed', 'Demand Letter', 'Extension Letter'])
                ->shuffle()
                ->take(rand(0, 2));

            $letterTypes->each(function (string $type) use ($po) {
                // Avoid duplicate letter monitoring entries for the same PO and type
                if (! PoLetterMonitoring::where('po_number', $po->po_number)->where('type_of_letter', $type)->exists()) {
                    PoLetterMonitoring::factory()
                        ->forServePo($po)
                        ->state(['type_of_letter' => $type])
                        ->create();
                }
            });

            PirMonitoring::factory()->forServePo($po)->create();
        });
    }
}