<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\StockItem;
use App\Models\Unit;

class StockItemSeeder extends Seeder
{
    public function run(): void
    {
        $items = StockItem::factory(5)->create();

        $unitIds = Unit::pluck('unitID')->all();

        foreach ($items as $item) {
            $chosen = collect($unitIds)->shuffle()->take(rand(1, 2))->values();

            $chosen->each(function ($uid, $index) use ($item) {
                $item->units()->syncWithoutDetaching([
                    $uid => ['is_default' => $index === 0],
                ]);
            });
        }
    }
}
