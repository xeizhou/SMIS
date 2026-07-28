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
        Schema::table('bona_vida_monitoring', function (Blueprint $table) {
            $table->string('invoice_no')->change();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('bona_vida_monitoring', function (Blueprint $table) {
            $table->integer('invoice_no')->change();
        });
    }
};
