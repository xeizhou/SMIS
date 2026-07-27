<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Transaction;

class TransactionSeeder extends Seeder
{
    public function run(): void
    {
        // Seed a set of transactions tied to existing stock items, units, and offices
        Transaction::factory(200)->create();
    }
}
