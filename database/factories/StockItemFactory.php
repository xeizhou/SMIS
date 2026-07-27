<?php

namespace Database\Factories;

use App\Models\Unit;
use App\Models\FundCluster;
use Illuminate\Database\Eloquent\Factories\Factory;

class StockItemFactory extends Factory
{
    public function definition(): array
    {
        $items = [
            ['Bond Paper A4', 'PAPER-001'],
            ['Bond Paper Legal', 'PAPER-002'],
            ['Ballpen Black', 'PEN-001'],
            ['Ballpen Blue', 'PEN-002'],
            ['Pencil No. 2', 'PENCIL-001'],
            ['Permanent Marker', 'MARKER-001'],
            ['Whiteboard Marker', 'MARKER-002'],
            ['Stapler', 'STAPLER-001'],
            ['Staple Wire No. 35', 'STAPLE-001'],
            ['Paper Clip 33mm', 'CLIP-001'],
            ['Binder Clip Large', 'CLIP-002'],
            ['Correction Tape', 'CORR-001'],
            ['Scissors 8-inch', 'SCISSOR-001'],
            ['Packing Tape', 'TAPE-001'],
            ['Masking Tape', 'TAPE-002'],
            ['Notebook', 'NOTEBOOK-001'],
            ['Logbook', 'LOGBOOK-001'],
            ['Printer Ink Black', 'INK-001'],
            ['Printer Ink Cyan', 'INK-002'],
            ['Printer Toner HP 85A', 'TONER-001'],
            ['USB Flash Drive 32GB', 'USB-001'],
            ['External Hard Drive 1TB', 'HDD-001'],
            ['Mouse USB', 'MOUSE-001'],
            ['Keyboard USB', 'KEYBOARD-001'],
            ['Extension Cord', 'ELEC-001'],
        ];

        [$description, $code] = fake()->randomElement($items);

        return [
            'stock_no' => fake()->unique()->bothify($code . '-###'),
            'item_name' => $description,
            'description' => fake()->optional()->sentence(),
            'on_hand_quantity' => fake()->numberBetween(0, 200),
            're_order_point' => fake()->numberBetween(5, 30),
            'fund_cluster_id' => FundCluster::inRandomOrder()->value('fund_cluster_id'),
            'link' => null,
            'remarks' => fake()->optional()->sentence(),
        ];
    }
}