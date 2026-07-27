<?php

namespace Database\Factories;

use App\Models\FundCluster;
use App\Models\Office;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Factories\Factory;

class ServePoFactory extends Factory
{
    public function definition(): array
    {
        $abc = $this->faker->randomFloat(2, 5000, 500000);
        $po = $abc - $this->faker->randomFloat(2, 0, 5000);

        return [
            'po_number' => 'PO-' . $this->faker->unique()->numerify('####-####'),
            'item_description' => $this->faker->sentence(6),
            'po_date' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'po_received_date' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'inclusive_date' => $this->faker->monthName() . ' ' . $this->faker->year(),
            'due_date' => $this->faker->dateTimeBetween('now', '+2 months'),
            'pr_number' => 'PR-' . $this->faker->numerify('####'),
            'pr_date' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'philgeps_reference_no' => $this->faker->numerify('#######'),
            'mode_of_procurement' => $this->faker->randomElement([
                'Public Bidding', 'Small Value Procurement', 'Direct Contracting', 'Shopping',
            ]),
            'total_amount_abc' => $abc,
            'total_amount_po' => $po,
            'total_amount_diff' => $abc - $po,
            'fund_cluster_id' => FundCluster::inRandomOrder()->value('fund_cluster_id'),
            'ors_burs_no' => $this->faker->numerify('ORS-####'),
            'ors_burs_date' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'responsibility_center' => $this->faker->word(),
            'uacs_object_code' => $this->faker->numerify('#####-##'),
            'supplier_id' => Supplier::inRandomOrder()->value('supplier_id'),
            'end_user' => Office::inRandomOrder()->value('office_code'),
            'date_forwarded_to_smu' => $this->faker->dateTimeBetween('-6 months', 'now'),
            'coa_processed_date' => $this->faker->optional()->dateTimeBetween('-6 months', 'now'),
            'date_forwarded_frontdesk' => $this->faker->optional()->dateTimeBetween('-6 months', 'now'),
        ];
    }
}