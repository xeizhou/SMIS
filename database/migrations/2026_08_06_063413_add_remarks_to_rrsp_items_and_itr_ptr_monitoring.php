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
        Schema::table('rrsp_items', function (Blueprint $table) {
            $table->text('remarks')->nullable()->after('status');
        });

        Schema::table('itr_ptr_monitoring', function (Blueprint $table) {
            $table->text('remarks')->nullable()->after('condition_of_ppe');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rrsp_items_and_itr_ptr_monitoring', function (Blueprint $table) {
            //
        });
    }
};
