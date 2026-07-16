<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('units', function (Blueprint $table) {
            $table->id('unitID');
            $table->string('unit_name', 50);
            $table->string('unit_short_name', 10);
            // NOTE: source SQL has no created_at/updated_at for this table — omitted to match.
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('units');
    }
};
