<?php

namespace Database\Factories;

use App\Models\ServePo;
use Illuminate\Database\Eloquent\Factories\Factory;

class PirMonitoringFactory extends Factory
{
    public function definition(): array
    {
        return [
            'pr_number' => 'PR-' . $this->faker->numerify('####'),
            'pr_date' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'ors_bur_number' => $this->faker->numerify('ORS-####'),
            'ors_bur_date' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'date_forwarded_supplier' => $this->faker->optional()->dateTimeBetween('-6 months', 'now'),
            'forwarded_by_supplier' => $this->faker->name(),
            'claimed_by_supplier' => $this->faker->name(),
            'supplier_signature_date' => $this->faker->optional()->dateTimeBetween('-6 months', 'now'),
            'invoice_number' => $this->faker->numerify('INV-####'),
            'invoice_date' => $this->faker->dateTimeBetween('-6 months', 'now'),
            'delivery_receipt' => $this->faker->numerify('DR-####'),
            'inspected_by' => $this->faker->name(),
            'inspection_date' => $this->faker->optional()->dateTimeBetween('-6 months', 'now'),
            'iar_number' => $this->faker->numerify('IAR-####'),
            'status' => $this->faker->randomElement(['Pending', 'Ongoing', 'Completed']),
            'remarks' => $this->faker->optional()->sentence(),
        ];
        // supplier_id, po_number, unit_office, po_date, fund_cluster, po_amount set explicitly from the ServePo
    }

    public function forServePo(ServePo $po): static
    {
        return $this->state(fn () => [
            'po_number' => $po->po_number,
            'supplier_id' => $po->supplier_id,
            'unit_office' => $po->end_user,
            'po_date' => $po->po_date,
            'fund_cluster' => $po->fund_cluster_id,
            'po_amount' => $po->total_amount_po,
            'delivery_term' => $this->faker->numberBetween(15, 60),
        ]);
    }
}