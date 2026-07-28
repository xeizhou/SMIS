<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\StockItem;
use App\Models\Unit;

class StockItemSeeder extends Seeder
{
    public function run(): void
    {
        // Create a reasonable number of stock items and ensure they link to units and fund clusters
        $items = StockItem::factory(50)->create();

        // Attach 1-2 units to each stock item through the pivot table
        $unitIds = Unit::pluck('unitID')->all();

        foreach ($items as $item) {
            $chosen = (array)collect($unitIds)->shuffle()->take(rand(1, 2))->all();
            $first = true;
            foreach ($chosen as $uid) {
                $item->units()->attach($uid, ['is_default' => $first]);
                $first = false;
            }
        }
    }
}
