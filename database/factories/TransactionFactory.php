<?php

namespace Database\Factories;

use App\Models\FundCluster;
use App\Models\Office;
use App\Models\StockItem;
use App\Models\Unit;
use Illuminate\Database\Eloquent\Factories\Factory;

class TransactionFactory extends Factory
{
    public function definition(): array
    {
        $stockItem = StockItem::inRandomOrder()->first();

        // Prefer the unit attached to the stock item (via pivot table). Fallback to a random unit.
        $unitId = null;
        if ($stockItem) {
            $unitId = \DB::table('stock_item_unit')
                ->where('stock_no', $stockItem->stock_no)
                ->inRandomOrder()
                ->value('unitID');
        }

        if (! $unitId) {
            $unitId = Unit::inRandomOrder()->value('unitID');
        }

        return [
            'transaction_type' => fake()->randomElement(['IN', 'OUT']),
            'fund_cluster' => FundCluster::inRandomOrder()->value('fund_cluster_id'),
            'transaction_date' => fake()->dateTimeBetween('-1 year', 'now'),
            'item_name' => $stockItem ? $stockItem->item_name : fake()->word(),
            'unitID' => $unitId,
            'reference' => fake()->bothify('REF-####'),
            'quantity' => fake()->numberBetween(1, 100),
            'office_code' => Office::inRandomOrder()->value('office_code'),
        ];
    }
}
