<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fund_clusters', function (Blueprint $table) {
            // Natural string PK, e.g. "01-RAF" — not auto-incrementing.
            $table->string('fund_cluster_id', 20)->primary();
            $table->string('fund_description', 255)->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('fund_clusters');
    }
};
