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
        Schema::table('clearance', function (Blueprint $table) {
            $table->unsignedBigInteger('checked_by_id')->nullable();
            
            $table->foreign('checked_by_id', 'fk_clearance_checked_by')
                  ->references('id')->on('users')
                  ->nullOnDelete();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clearance', function (Blueprint $table) {
            $table->dropForeign('fk_clearance_checked_by');
            $table->dropColumn('checked_by_id');
        });
    }
};
