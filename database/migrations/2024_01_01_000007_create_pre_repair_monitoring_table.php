<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * ASSUMPTION / FIX: same id-vs-PK issue as itr_ptr_monitoring. `id` is now
     * the true auto-increment PK. The original composite PK
     * (transaction_no, pre_repair_no) becomes a UNIQUE constraint, and the
     * composite UNIQUE (pre_repair_no, transaction_no, property_no) is kept
     * because for_disposal_monitoring's foreign key depends on it.
     *
     * Composite FK: Laravel's foreignId()->constrained() only supports
     * single-column references, so the (transaction_no, property_no) => 
     * itr_ptr_monitoring(transaction_no, property_no) relationship is
     * declared with $table->foreign([...])->references([...])->on(...).
     */
    public function up(): void
    {
        Schema::create('pre_repair_monitoring', function (Blueprint $table) {
            $table->id();
            $table->string('transaction_no', 50);
            $table->string('pre_repair_no', 50);
            $table->string('from_accountable_officer', 100);
            $table->string('to_accountable_officer', 100);
            $table->string('property_no', 50);
            $table->text('description');
            $table->decimal('amount', 15, 2);
            $table->string('condition_of_ppe', 50);
            $table->string('location', 100);
            $table->timestamps();

            $table->unique(['transaction_no', 'pre_repair_no'], 'uq_pre_repair_pk');
            $table->unique(['pre_repair_no', 'transaction_no', 'property_no'], 'uq_pre_repair_full');

            $table->foreign(['transaction_no', 'property_no'], 'fk_pre_repair_transaction')
                ->references(['transaction_no', 'property_no'])
                ->on('itr_ptr_monitoring');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pre_repair_monitoring');
    }
};
