<?php

namespace Database\Factories;

use App\Models\ServePo;
use Illuminate\Database\Eloquent\Factories\Factory;

class PoLetterMonitoringFactory extends Factory
{
    public function definition(): array
    {
        return [
            'reference_no' => 'REF-' . $this->faker->unique()->numerify('####'),
            'po_date' => $this->faker->dateTimeBetween('-6 months', 'now'),
            'date_received_by_supplier' => $this->faker->optional()->dateTimeBetween('-6 months', 'now'),
            'delivery_term' => $this->faker->numberBetween(15, 60),
            'due_date' => $this->faker->dateTimeBetween('now', '+1 month'),
            'type_of_letter' => $this->faker->randomElement(['Notice to Proceed', 'Demand Letter', 'Extension Letter']),
            'date_received_by_smu' => $this->faker->optional()->dateTimeBetween('-6 months', 'now'),
            'date_forwarded_to_ovpad' => $this->faker->optional()->dateTimeBetween('-6 months', 'now'),
            'received_by' => $this->faker->name(),
            'status_of_the_letter' => $this->faker->randomElement(['Pending', 'Forwarded', 'Released', 'Returned']),
            'document_link' => $this->faker->optional()->url(),
            'date_forwarded_to_end_user' => $this->faker->optional()->dateTimeBetween('-6 months', 'now'),
            'remarks' => $this->faker->optional()->sentence(),
        ];
        // supplier_id, po_number, office_end_user set explicitly from the ServePo it's tied to
    }

    public function forServePo(ServePo $po): static
    {
        return $this->state(fn () => [
            'po_number' => $po->po_number,
            'supplier_id' => $po->supplier_id,
            'office_end_user' => $po->end_user,
        ]);
    }
}