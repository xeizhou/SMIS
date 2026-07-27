<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop the foreign key connecting pre-repair to ITR/PTR
        Schema::table('pre_repair_monitoring', function (Blueprint $table) {
            $table->dropForeign(['transaction_no', 'property_no']);
            $table->text('remarks')->nullable()->after('condition_of_ppe');
        });

        // Add remarks to for disposal
        Schema::table('for_disposal_monitoring', function (Blueprint $table) {
            $table->text('remarks')->nullable()->after('condition_of_ppe');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('pre_repair_monitoring', function (Blueprint $table) {
            $table->dropColumn('remarks');
            $table->foreign(['transaction_no', 'property_no'], 'fk_pre_repair_transaction')
                ->references(['transaction_no', 'property_no'])
                ->on('itr_ptr_monitoring');
        });

        Schema::table('for_disposal_monitoring', function (Blueprint $table) {
            $table->dropColumn('remarks');
        });
    }
};
