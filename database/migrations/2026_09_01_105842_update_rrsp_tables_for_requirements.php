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
        Schema::table('rrsp_monitoring', function (Blueprint $table) {
            $table->string('return_by')->nullable()->after('end_user_name');
        });

        Schema::table('rrsp_items', function (Blueprint $table) {
            $table->string('item_name')->nullable()->after('rrsp_monitoring_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('rrsp_monitoring', function (Blueprint $table) {
            $table->dropColumn('return_by');
        });

        Schema::table('rrsp_items', function (Blueprint $table) {
            $table->dropColumn('item_name');
        });
    }
};
