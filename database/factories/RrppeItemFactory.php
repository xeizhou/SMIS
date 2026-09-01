<?php

namespace Database\Factories;

use App\Models\RrppeItem;
use App\Models\RRPPEMonitoring;
use Illuminate\Database\Eloquent\Factories\Factory;

class RrppeItemFactory extends Factory
{
    protected $model = RrppeItem::class;

    public function definition(): array
    {
        return [
            'rrppe_monitoring_id' => RRPPEMonitoring::factory(),
            'item_name' => $this->faker->word(),
            'item_description' => $this->faker->sentence(6),
            'quantity' => $this->faker->numberBetween(1, 50),
            'property_no' => strtoupper($this->faker->bothify('PROP-###')),
            'cost' => $this->faker->randomFloat(2, 100, 10000),
            'status' => $this->faker->randomElement(['SERVICEABLE', 'UNSERVICEABLE']),
            'area' => $this->faker->city(),
            'remarks' => $this->faker->optional()->sentence(),
        ];
    }
}
