<?php

namespace Database\Factories;

use App\Models\BonaVidaMonitoring;
use App\Models\Office;
use Illuminate\Database\Eloquent\Factories\Factory;

class BonaVidaMonitoringFactory extends Factory
{
    protected $model = BonaVidaMonitoring::class;

    public function definition(): array
    {
        $officeCode = Office::inRandomOrder()->value('office_code');
        $qty = $this->faker->numberBetween(1, 100);
        $price = $this->faker->randomFloat(2, 100, 2000);

        return [
            'date_received' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'office_code' => $officeCode,
            'qty' => $qty,
            'price' => $price,
            'total_amount' => round($qty * $price, 2),
            'invoice_no' => $this->faker->numberBetween(1000, 9999),
            'invoice_date' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'remarks' => $this->faker->optional()->sentence(),
        ];
    }
}
