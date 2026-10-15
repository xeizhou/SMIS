<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PoItemDescription extends Model
{
    use HasFactory;

    protected $table = 'po_item_descriptions';

    protected $fillable = [
        'name',
    ];
}
