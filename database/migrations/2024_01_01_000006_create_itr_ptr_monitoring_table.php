<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * ASSUMPTION / FIX:
     * The source SQL declares `id INT AUTO_INCREMENT` as a plain (non-unique)
     * KEY while the real PRIMARY KEY is `transaction_no` (a VARCHAR). MySQL
     * permits an AUTO_INCREMENT column that isn't the primary key as long as
     * it is indexed. SQLite does NOT support this: an autoincrementing column
     * must itself be the table's INTEGER PRIMARY KEY (rowid alias).
     *
     * Fix applied: `id` becomes the real auto-incrementing primary key, and
     * `transaction_no` becomes a UNIQUE string column instead of the PK. This
     * also matches Laravel/Eloquent convention (integer PK, route model
     * binding, etc.) requested by the project. The composite UNIQUE on
     * (transaction_no, property_no) is preserved unchanged because
     * pre_repair_monitoring's composite foreign key depends on it.
     */
    public function up(): void
    {
        Schema::create('itr_ptr_monitoring', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_no', 50)->unique();
            $table->date('date_release');
            $table->string('claimed_by', 100);
            $table->string('from_accountable_officer', 100);
            $table->string('to_accountable_officer', 100);
            $table->string('property_no', 50);
            $table->text('description');
            $table->decimal('amount', 15, 2);
            $table->string('condition_of_ppe', 50);
            $table->string('location', 100);
            $table->date('date_received');
            $table->timestamps();

            $table->unique(['transaction_no', 'property_no'], 'uq_transaction_property');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('itr_ptr_monitoring');
    }
};
