<?php

namespace Database\Seeders;

use App\Models\Delivery;
use App\Models\FundCluster;
use App\Models\Office;
use App\Models\PirMonitoring;
use App\Models\PoLetterMonitoring;
use App\Models\ServePo;
use App\Models\Supplier;
use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::factory()->create([
            'name' => 'admin',
            'email' => 'admin@gmail.com',
            'password' => Hash::make('12345678'),
            'role' => 'admin',
        ]);

        // Order matters — parents before children.
        $fundClusters = FundCluster::factory(5)->create();
        $offices = Office::factory(8)->create();
        $suppliers = Supplier::factory(10)->create();

        $purchaseOrders = ServePo::factory(30)->create();

        $purchaseOrders->each(function (ServePo $po) {
            Delivery::factory(rand(1, 2))->forServePo($po)->create();

            $letterTypes = collect(['Notice to Proceed', 'Demand Letter', 'Extension Letter'])
                ->shuffle()
                ->take(rand(0, 2));

            $letterTypes->each(function (string $type) use ($po) {
                PoLetterMonitoring::factory()
                    ->forServePo($po)
                    ->state(['type_of_letter' => $type])
                    ->create();
            });

            PirMonitoring::factory()->forServePo($po)->create();
        });
    }
}