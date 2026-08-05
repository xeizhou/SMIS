<?php

namespace Database\Factories;

use App\Models\RrspItem;
use Illuminate\Database\Eloquent\Factories\Factory;

class RrspItemFactory extends Factory
{
    protected $model = RrspItem::class;

    public function definition(): array
    {
        return [
            'item_description' => $this->faker->sentence(6),
            'quantity' => $this->faker->numberBetween(1, 200),
            'property_no' => strtoupper($this->faker->bothify('PROP-###')),
            'cost' => $this->faker->randomFloat(2, 100, 10000),
            'kind_of_semi_expendable' => $this->faker->randomElement(['Furniture', 'Electronics', 'Tools', 'Office Equipment']),
            'status' => $this->faker->randomElement(['Active', 'Inactive', 'Disposed']),
            'area' => $this->faker->city(),
        ];
    }
}