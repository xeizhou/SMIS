<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('offices', function (Blueprint $table) {
            // Natural string PK, e.g. "CGB".
            $table->string('office_code', 20)->primary();
            $table->string('office_name', 150)->nullable();
            $table->string('entity_name', 255)->nullable();
            // NOTE: source SQL has no created_at/updated_at for this table — omitted to match.
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('offices');
    }
};
