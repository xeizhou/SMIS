<?php

namespace Database\Factories;

use App\Models\RegspiMonitoring;
use App\Models\RrspMonitoring;
use App\Models\FundCluster;
use Illuminate\Database\Eloquent\Factories\Factory;

class RegspiMonitoringFactory extends Factory
{
    protected $model = RegspiMonitoring::class;

    public function definition(): array
    {
        $rrsp = RrspMonitoring::inRandomOrder()->first();

        return [
            'month_year' => $this->faker->monthName() . ' ' . $this->faker->year(),
            'ics_no' => $this->faker->optional()->bothify('ICS-####'),
            'rrsp_no' => $rrsp?->rrsp_no,
            'fund_cluster_id' => FundCluster::inRandomOrder()->value('fund_cluster_id'),
            'semi_expendable_property_no' => strtoupper($this->faker->bothify('SEP-###')),
            'item_description' => $this->faker->sentence(6),
            'estimated_useful_life' => $this->faker->numberBetween(1, 10),
            'issued_qty' => $this->faker->numberBetween(0, 100),
            'issued_office_officer' => $this->faker->name(),
            'returned_qty' => $this->faker->numberBetween(0, 50),
            'returned_office_officer' => $this->faker->optional()->name(),
            'reissued_qty' => $this->faker->numberBetween(0, 50),
            'reissued_office_officer' => $this->faker->optional()->name(),
            'disposed_qty' => $this->faker->numberBetween(0, 20),
            'balance_qty' => 0,
            'amount' => $this->faker->randomFloat(2, 100, 5000),
            'remarks' => $this->faker->optional()->sentence(),
        ];
    }

    public function configure()
    {
        return $this->afterMaking(function (RegspiMonitoring $regspi) {
            $regspi->balance_qty = ($regspi->issued_qty - $regspi->returned_qty + $regspi->reissued_qty - $regspi->disposed_qty);
        });
    }
}
