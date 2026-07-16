<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * ASSUMPTION / FIX: same id-vs-PK issue. `id` is the true auto-increment
     * PK; `transaction_no` (originally the sole PK) becomes UNIQUE instead.
     */
    public function up(): void
    {
        Schema::create('for_disposal_monitoring', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_no', 50)->unique();
            $table->string('pre_repair_no', 50);
            $table->string('from_accountable_officer', 100);
            $table->string('to_accountable_officer', 100);
            $table->string('property_no', 50);
            $table->text('description');
            $table->decimal('amount', 15, 2);
            $table->string('condition_of_ppe', 50);
            $table->string('location', 100);
            $table->timestamps();

            $table->foreign(['pre_repair_no', 'transaction_no', 'property_no'], 'fk_disposal_pre_repair_full')
                ->references(['pre_repair_no', 'transaction_no', 'property_no'])
                ->on('pre_repair_monitoring');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('for_disposal_monitoring');
    }
};
