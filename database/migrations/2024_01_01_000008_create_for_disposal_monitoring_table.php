<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('for_disposal_monitoring', function (Blueprint $table) {
            $table->id();

            // Tracks the model that generated this disposal record.
            // Examples: rrsp_item, rrppe_monitoring.
            // Nullable for manually-created disposal records.
            $table->string('source_type', 50)->nullable();
            $table->unsignedBigInteger('source_id')->nullable();

            // Unique transaction number for each disposal record.
            $table->string('transaction_no', 50)->unique();

            $table->string('pre_repair_no', 50)->nullable();
            $table->string('from_accountable_officer', 100);
            $table->string('to_accountable_officer', 100);
            $table->string('property_no', 50);
            $table->text('description');
            $table->decimal('amount', 15, 2);
            $table->string('condition_of_ppe', 50);
            $table->text('remarks')->nullable();
            $table->string('location', 100);

            $table->timestamps();

            // Prevent duplicate disposal records for the same source.
            // This supports the observers for RrspItem and RRPPEMonitoring.
            $table->unique(
                ['source_type', 'source_id'],
                'for_disposal_source_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('for_disposal_monitoring');
    }
};