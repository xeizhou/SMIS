<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('po_letter_monitoring', function (Blueprint $table) {
            $table->integer('delivery_term')->default(0)->change();
        });
    }

    public function down(): void
    {
        Schema::table('po_letter_monitoring', function (Blueprint $table) {
            $table->string('delivery_term', 50)->nullable()->change();
        });
    }
};
