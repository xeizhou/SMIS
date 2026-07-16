<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supplier_list', function (Blueprint $table) {
            $table->id('supplier_id');
            $table->string('supplier_name', 255)->unique();
            // NOTE: source SQL has no created_at/updated_at for this table — omitted to match.
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supplier_list');
    }
};
