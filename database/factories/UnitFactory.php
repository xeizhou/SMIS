<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class UnitFactory extends Factory
{
    public function definition(): array
    {
        return [
            'unit_name' => fake()->randomElement(['Piece', 'Box', 'Pack', 'Set', 'Roll', 'Bottle']),
            'unit_short_name' => fake()->randomElement(['pc', 'box', 'pkt', 'set', 'roll', 'btl']),
        ];
    }
}
