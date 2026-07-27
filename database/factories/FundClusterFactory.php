<?php

namespace Database\Factories;

use Illuminate\Database\Eloquent\Factories\Factory;

class FundClusterFactory extends Factory
{
    public function definition(): array
    {
        return [
            'fund_cluster_id' => $this->faker->unique()->numerify('FC-##'),
            'fund_description' => $this->faker->randomElement([
                'General Fund', 'Trust Fund', 'Special Education Fund', 'Income Fund',
            ]),
        ];
    }
}