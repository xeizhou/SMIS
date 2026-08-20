<?php

namespace Database\Factories;

use App\Models\FundCluster;
use App\Models\Office;
use App\Models\Supplier;
use Illuminate\Database\Eloquent\Factories\Factory;

class ServePoFactory extends Factory
{
    /**
     * Brand + product combos to build realistic-looking procurement line items.
     * Keyed loosely by category so brand/product pairs make sense together.
     */
    private array $itemCatalog = [
        ['brand' => 'MSI', 'product' => 'MAG MONITOR 240HZ'],
        ['brand' => 'NVIDIA', 'product' => 'RTX 5090 GPU'],
        ['brand' => 'ASUS', 'product' => 'ROG STRIX MOTHERBOARD'],
        ['brand' => 'LOGITECH', 'product' => 'MX MASTER WIRELESS MOUSE'],
        ['brand' => 'HP', 'product' => 'LASERJET PRO PRINTER'],
        ['brand' => 'EPSON', 'product' => 'L3210 INK TANK PRINTER'],
        ['brand' => 'DELL', 'product' => 'LATITUDE LAPTOP'],
        ['brand' => 'LENOVO', 'product' => 'THINKPAD LAPTOP'],
        ['brand' => 'SAMSUNG', 'product' => '27" CURVED MONITOR'],
        ['brand' => 'KINGSTON', 'product' => '16GB DDR5 RAM'],
        ['brand' => 'SEAGATE', 'product' => '2TB EXTERNAL HDD'],
        ['brand' => 'WD', 'product' => '1TB NVME SSD'],
        ['brand' => 'CANON', 'product' => 'DSLR CAMERA'],
        ['brand' => 'TP-LINK', 'product' => 'WIFI 6 ROUTER'],
        ['brand' => 'APC', 'product' => 'UPS BACKUP UNIT'],
        ['brand' => 'BROTHER', 'product' => 'LABEL PRINTER'],
        ['brand' => 'CISCO', 'product' => '24-PORT NETWORK SWITCH'],
        ['brand' => 'JBL', 'product' => 'PORTABLE SPEAKER'],
        ['brand' => 'STEELSERIES', 'product' => 'MECHANICAL KEYBOARD'],
        ['brand' => 'GENERIC', 'product' => 'BOND PAPER A4 (REAM)'],
    ];

    public function definition(): array
    {
        $abc = $this->faker->randomFloat(2, 5000, 500000);
        $po = $abc - $this->faker->randomFloat(2, 0, 5000);

        return [
            'po_number' => 'PO-' . $this->faker->unique()->numerify('####-####'),
            'item_description' => $this->generateItemDescription(),
            'po_date' => $this->faker->dateTimeBetween('-1 year', 'now'),
            'delivery_term' => $this->faker->numberBetween(5, 60),
            'po_received_date' => $this->faker->dateTimeBetween('-6 months', 'now'),
            'inclusive_date' => $this->faker->monthName() . ' ' . $this->faker->year(),
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

    /**
     * Build a multi-line item description, e.g.:
     * MSI MAG MONITOR 240HZ 3PCS
     * NVIDIA RTX 5090 GPU 2PCS
     */
    private function generateItemDescription(): string
    {
        $lineCount = $this->faker->numberBetween(1, 4);

        $items = $this->faker->randomElements($this->itemCatalog, $lineCount);

        $lines = array_map(function (array $item) {
            $qty = $this->faker->numberBetween(1, 20);

            return "{$item['brand']} {$item['product']} {$qty}PCS";
        }, $items);

        return implode("\n", $lines);
    }
}