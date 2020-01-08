// Opcode patterns
const CC=0x03;
const BBB=0x1c;
const AAA=0xe0;

// CPU flags
const CFLAG=0x01; // Carry
const ZFLAG=0x02; // Zero
const IFLAG=0x04; // Interrupt disable
const DFLAG=0x08; // Decimal mode
const BFLAG=0x10; // Break command
const XFLAG=0x20; // UNKNOWN
const VFLAG=0x40; // Overflow
const NFLAG=0x80; // Negative

// Stack
const STACK=0x0100;

// CPU registers (location after memory)
const AREG=0xffff+2; // accumulator
const XREG=0xffff+3; // X index
const YREG=0xffff+4; // Y index
const SREG=0xffff+5; // stack pointer

function debug(message)
{
//  console.log(message);
}

// Opcode clock cycles
// +1 if page boundary crossed
//
// +1 if branch on same page
// +2 if branch to different page
var cycles=[
// 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, a, b, c, d, e, f,
   7, 6,  ,  ,  , 3, 5,  , 3, 2, 2,  ,  , 4, 6,  , // 00
   2, 5,  ,  ,  , 4, 6,  , 2, 4,  ,  ,  , 4, 7,  , // 10
   6, 6,  ,  , 3, 3, 5,  , 4, 2, 2,  , 4, 4, 6,  , // 20
   2, 5,  ,  ,  , 4, 6,  , 2, 4,  ,  ,  , 4, 7,  , // 30
   6, 6,  ,  ,  , 3, 5,  , 3, 2, 2,  , 3, 4, 6,  , // 40
   2, 5,  ,  ,  , 4, 6,  , 2, 4,  ,  ,  , 4, 7,  , // 50
   6, 6,  ,  ,  , 3, 5,  , 4, 2, 2,  , 5, 4, 6,  , // 60
   2, 5,  ,  ,  , 4, 6,  , 2, 4,  ,  ,  , 4, 7,  , // 70
    , 6,  ,  , 3, 3, 3,  , 2,  , 2,  , 4, 4, 4,  , // 80
   2, 6,  ,  , 4, 4, 4,  , 2, 5, 2,  ,  , 5,  ,  , // 90
   2, 6, 2,  , 3, 3, 3,  , 2, 2, 2,  , 4, 4, 4,  , // a0
   2, 5,  ,  , 4, 4, 4,  , 2, 4, 2,  , 4, 4, 4,  , // b0
   2, 6,  ,  , 3, 3, 5,  , 2, 2, 2,  , 4, 4, 6,  , // c0
   2, 5,  ,  ,  , 4, 6,  , 2, 4,  ,  ,  , 4, 7,  , // d0
   2, 6,  ,  , 3, 3, 5,  , 2, 2, 2,  , 4, 4, 6,  , // e0
   2, 5,  ,  ,  , 4, 6,  , 2, 4,  ,  ,  , 4, 7,  , // f0
];

// Opcode address modes
// 0 Accumulator
// 1 Absolute
// 2 Absolute, X-indexed
// 3 Absolute, Y-indexed
// 4 Immediate
// 5 Implied
// 6 Indirect
// 7 X-indexed, indirect
// 8 Indirect, Y-indexed
// 9 Relative
// 10 Zeropage
// 11 Zeropage, X-indexed
// 12 Zeropage, Y-indexed
var addrmodes=[
// 00, 01, 02, 03, 04, 05, 06, 07, 08, 09, 0a, 0b, 0c, 0d, 0e, 0f,
   5 , 7 ,   ,   ,   , 10, 10,   , 5 , 4 , 0 ,   ,   , 1 , 1 ,   , // 00
   9 , 8 ,   ,   ,   , 11, 11,   , 5 , 3 ,   ,   ,   , 2 , 2 ,   , // 10
   1 , 7 ,   ,   , 10, 10, 10,   , 5 , 4 , 0 ,   , 1 , 1 , 1 ,   , // 20
   9 , 8 ,   ,   ,   , 11, 11,   , 5 , 3 ,   ,   ,   , 2 , 2 ,   , // 30
   5 , 7 ,   ,   ,   , 10, 10,   , 5 , 4 , 0 ,   , 1 , 1 , 1 ,   , // 40
   9 , 8 ,   ,   ,   , 11, 11,   , 5 , 3 ,   ,   ,   , 2 , 2 ,   , // 50
   5 , 7 ,   ,   ,   , 10, 10,   , 5 , 4 , 0 ,   , 6 , 1 , 1 ,   , // 60
   9 , 8 ,   ,   ,   , 11, 11,   , 5 , 3 ,   ,   ,   , 2 , 2 ,   , // 70
     , 7 ,   ,   , 10, 10, 10,   , 5 ,   , 5 ,   , 1 , 1 , 1 ,   , // 80
   9 , 8 ,   ,   , 11, 11, 12,   , 5 , 3 , 5 ,   ,   , 2 ,   ,   , // 90
   4 , 7 , 4 ,   , 10, 10, 10,   , 5 , 4 , 5 ,   , 1 , 1 , 1 ,   , // a0
   9 , 8 ,   ,   , 11, 11, 12,   , 5 , 3 , 5 ,   , 2 , 2 , 3 ,   , // b0
   4 , 7 ,   ,   , 10, 10, 10,   , 5 , 4 , 5 ,   , 1 , 1 , 1 ,   , // c0
   9 , 8 ,   ,   ,   , 11, 11,   , 5 , 3 ,   ,   ,   , 2 , 2 ,   , // d0
   4 , 7 ,   ,   , 10, 10, 10,   , 5 , 4 , 5 ,   , 1 , 1 , 1 ,   , // e0
   9 , 8 ,   ,   ,   , 11, 11,   , 5 , 3 ,   ,   ,   , 2 , 2 ,   , // f0
];

var core={
  // Is the core running?
  running:false,

  // Last time we ran code (in milliseconds)
  lasttime:0,

  // Number of clock cycles remaining during this execution run
  clocks:0,

  // Memory plus registers
  mem:new Uint8Array(0xffff+1+4+1),

  // Program counter
  pc:0,
  oldpc:0,

  // CPU flags (status register)
  flags:0,

  ci:0,
  addr:0,
  aaa:0, // opcode
  bbb:0, // addressing mode
  cc:0, // opcode table

  CLEARFLAG:function(x)
  {
    this.flags&=(~x);
  },

  SETFLAG:function(x)
  {
   this.flags|=x;
  },

  // Push a byte onto the stack
  push:function(topush)
  {
    if (this.mem[this.mem[SREG]]==0x01)
    {
      debug("STACK OVERFLOW");
      this.running=false;
      return;
    }

    this.mem[STACK+this.mem[SREG]]=topush;
    this.mem[SREG]--;
  },

  // Pop a byte from the stack
  pop:function()
  {
    if (this.mem[SREG]==0xff)
    {
      debug("STACK UNDERFLOW");
      this.running=false;
      return 0;
    }

    this.mem[SREG]++;
    return (this.mem[STACK+this.mem[SREG]]);
  },

  // Push a word onto the stack
  pushword:function(topush)
  {
    this.push((topush>>8)&0xff);
    this.push(topush&0xff);
  },

  // Pop a word from the stack
  popword:function()
  {
    var retval;

    retval=this.pop();
    retval|=(this.pop()<<8);

    return retval;
  },

  // Update Z N flags
  update_flagsZN:function(value)
  {
    if (value==0x00) this.SETFLAG(ZFLAG); else this.CLEARFLAG(ZFLAG);
    if (((value&0x80)!=0) || (value<0)) this.SETFLAG(NFLAG); else this.CLEARFLAG(NFLAG);
  },

  // Update Z V N flags
  update_flagsZVN:function(value)
  {
    this.update_flagsZN(value);

    if ((value&0x40)!=0) this.SETFLAG(VFLAG); else this.CLEARFLAG(VFLAG);
  },

  // Convert from BCD
  bcd:function(value)
  {
    var retval;

    if ((value&0xf0)<0xA0) retval=((value&0xf0)>>4)*10;
    if ((value&0x0f)<0x0A) retval+=(value&0x0f);

    return retval;
  },

  OSJump:function(addr)
  {
    switch (addr)
    {
      case 0xffe3: // OSASCI
        if (this.mem[AREG]==0x0d)
          document.write("<br/>");
        else
          document.write(String.fromCharCode(this.mem[AREG]));
        break;

      case 0xffe7: // OSNEWL
        document.write("<br/>");
        break;

      case 0xffee: // OSWRCH
        document.write(String.fromCharCode(this.mem[AREG]));
        break;
    }
  },

  // Fully reset the core state
  resetcore:function()
  {
    // Clear memory
    for (var i=0; i<this.mem.length; i++)
      this.mem[i]=0;

    // Set program counter
    this.pc=0;

    // Set CPU registers
    this.mem[AREG]=0;
    this.mem[XREG]=0;
    this.mem[YREG]=0;
    this.mem[SREG]=0xff;

    // Set default flag state
    this.flags=IFLAG;
  },

  // Determine source address for opcode
  sourceaddr:function()
  {
    var mode=addrmodes[this.ci];
    var src=0;

    if (mode==undefined) mode=-1;

    switch (mode)
    {
      case 0: // Accumulator
        debug("acc");
        src=AREG;
        break;

      case 1: // Absolute
        debug("abs");
        src=this.mem[this.pc++];
        src=(this.mem[this.pc++]<<8)+src;
        break;

      case 2: // Absolute, X-indexed
        debug("abs,X");
        src=this.mem[this.pc++];
        src=(this.mem[this.pc++]<<8)+src+this.mem[XREG];
        break;

      case 3: // Absolute, Y-indexed
        debug("abs,Y");
        src=this.mem[this.pc++];
        src=(this.mem[this.pc++]<<8)+src;
        src+=this.mem[YREG];
        break;

      case 4: // Immediate
        debug("#imm");
        src=this.pc++;
        break;

      case 5: // Implied
        debug("imp");
        // Used for instructions with no operands
        break;

      case 6: // Indirect
        debug("(ind)");
        src=this.mem[this.pc++];
        src=(this.mem[this.pc++]<<8)+src;

        src=this.mem[src]|(this.mem[src+1]<<8);
        break;

      case 7: // X-indexed, indirect
        debug("(zp,X)");
        src=this.mem[this.pc++];
        src=this.mem[src+this.mem[XREG]];
        break;

      case 8: // Indirect, Y-indexed
        debug("(zp),Y");
        src=this.mem[this.pc++];
        src=(this.mem[src+1]<<8)+this.mem[src];
        src+=this.mem[YREG];
        break;

      case 9: // Relative
        debug("rel");
        // Used for branches
        break;

      case 10: // Zeropage
        debug("zp");
        src=this.mem[this.pc++];
        break;

      case 11: // Zeropage, X-indexed
        debug("zp,X");
        src=this.mem[this.pc++]+this.mem[XREG];
        break;

      case 12: // Zeropage, Y-indexed
        debug("zp,Y");
        src=this.mem[this.pc++]+this.mem[YREG];
        break;

      default:
        debug("Invalid addressing mode "+mode);
        this.running=false;
        break;
    }

    return src;
  },

  // Step a single instruction
  stepcore:function()
  {
    var src;

    // Do nothing if core not running
    if (this.running==false)
      return;

    // Fetch current instruction
    this.ci=this.mem[this.pc];

    // Reduce remaining clock cycles
    this.clocks-=cycles[this.ci]||0;

    // Store old value of program counter for page changes
    this.oldpc=this.pc;

    // Move program counter on
    this.pc=(this.pc+1)&0xffff;

    // Decode current instruction
    this.aaa=(this.ci&AAA)>>5;
    this.bbb=(this.ci&BBB)>>2;
    this.cc=(this.ci&CC);

    debug("*** 0x"+this.ci.toString(16)+" aaa="+this.aaa+" bbb="+this.bbb+" cc="+this.cc+" ***");

    // Process addressing mode
    src=this.sourceaddr();
    if (this.running==false) return;

    // Execute instruction
    if (((this.ci&0x0f)==0x08) || // Implied instructions (no operand)
        ((this.ci>=0x80) && ((this.ci&0x0f)==0x0a)) 
    {
      switch (this.ci)
      {
        case 0x08: // * Push flags onto stack
          debug("PHP");
          this.push(this.flags|0x30); // (0x30 from beebem)
          break;

        case 0x18: // * Clear CARRY flag
          debug("CLC"); // C
          this.CLEARFLAG(CFLAG);
          break;

        case 0x28: // * Pull from stack to flags
          debug("PLP"); // ALL
          this.flags=this.pop();
          break;

        case 0x38: // * Set CARRY flag
          debug("SEC"); // C
          this.SETFLAG(CFLAG);
          break;

        case 0x48: // * Push A onto stack
          debug("PHA");
          this.push(this.mem[AREG]);
          break;

        case 0x58: // * Clear INTERRUPT (disable) flag (enable interrupts)
          debug("CLI"); // I
          this.CLEARFLAG(IFLAG);
          break;

        case 0x68: // * Pull from stack to A
          debug("PLA");
          this.mem[AREG]=this.pop();
          this.update_flagsZN(this.mem[AREG]);
          break;

        case 0x78: // * Set INTERRUPT (disable) flag (disable interrupts)
          debug("SEI"); // I
          this.SETFLAG(IFLAG);
          break;

        case 0x88: // * Decrement Y by 1
          debug("DEY"); // N Z
          this.mem[YREG]--;
          this.update_flagsZN(this.mem[YREG]);
          break;

        case 0x8a: // * Transfer X to A
          debug("TXA"); // N Z
          this.mem[AREG]=this.mem[XREG];
          this.update_flagsZN(this.mem[AREG]);
          break;

        case 0x98: // * Transfer Y to A
          debug("TYA"); // N Z
          this.mem[AREG]=this.mem[YREG];
          this.update_flagsZN(this.mem[AREG]);
          break;

        case 0x9a: // * Transfer X to stackpointer
          debug("TXS");
          this.mem[SREG]=this.mem[XREG];
          break;

        case 0xa8: // * Transfer A to Y
          debug("TAY"); // N Z
          this.mem[YREG]=this.mem[AREG];
          this.update_flagsZN(this.mem[YREG]);
          break;

        case 0xaa: // * Transfer A to X
          debug("TAX"); // N Z
          this.mem[XREG]=this.mem[AREG];
          this.update_flagsZN(this.mem[XREG]);
          break;

        case 0xb8: // * Clear OVERFLOW flag
          debug("CLV");
          this.CLEARFLAG(VFLAG);
          break;

        case 0xba: // * Transfer stackpointer to X
          debug("TSX");
          this.mem[XREG]=this.mem[SREG];
          this.update_flagsZN(this.mem[XREG]);
          break;

        case 0xc8: // * Increment Y by 1
          debug("INY"); // N Z
          this.mem[YREG]++;
          this.update_flagsZN(this.mem[YREG]);
          break;

        case 0xca: // * Decrement X by 1
          debug("DEX"); // N Z
          this.mem[XREG]--;
          this.update_flagsZN(this.mem[XREG]);
          break;

        case 0xd8: // * Clear DECIMAL flag
          debug("CLD"); // D
          this.CLEARFLAG(DFLAG);
          break;

        case 0xe8: // * Increment X by 1
          debug("INX"); // N Z
          this.mem[XREG]++;
          this.update_flagsZN(this.mem[XREG]);
          break;

        case 0xea: // * No operation
          debug("NOP");
          break;

        case 0xf8: // * Set BCD flag
          debug("SED"); // D
          this.SETFLAG(DFLAG);
          break;

        default:
          debug("Unknown opcode 0x"+this.ci.toString(16));
          this.running=false;
          return;
          break;
      }
    }
    else
    if ((this.ci&0x1f)==0x10) // Branch instructions
    {
      var debugstr="";
      this.addr=this.mem[this.pc++];
      if (this.addr>=0x80) this.addr-=0x100;

      debugstr+="if ";
      switch ((this.ci&0xc0)>>6)
      {
        case 0x00: // * Branch on NEGATIVE (BMI/BPL)
          debugstr+="NEG";
          if ((this.flags & NFLAG)==((this.ci&0x20)<<2))
          {
            this.clocks--;
            this.pc+=this.addr;
            if ((this.pc&0xff00) != ((this.oldpc+2)&0xff00)) this.clocks--;
          }
          break;

        case 0x01: // * Branch on OVERFLOW (BVC/BVS)
          debugstr+="OVR";
          if ((this.flags & VFLAG)==((this.ci&0x20)<<1))
          {
            this.clocks--;
            this.pc+=this.addr;
            if ((this.pc&0xff00) != ((this.oldpc+2)&0xff00)) this.clocks--;
          }
          break;

        case 0x02: // * Branch on CARRY (BCC/BCS)
          debugstr+="CRY";
          if ((this.flags & CFLAG)==((this.ci&0x20)>>5))
          {
            this.clocks--;
            this.pc+=this.addr;
            if ((this.pc&0xff00) != ((this.oldpc+2)&0xff00)) this.clocks--;
          }
          break;

        case 0x03: // * Branch on ZERO (BEQ/BNE)
          debugstr+="ZER";
          if ((this.flags & ZFLAG)==((this.ci&0x20)>>4))
          {
            this.clocks--;
            this.pc+=this.addr;
            if ((this.pc&0xff00) != ((this.oldpc+2)&0xff00)) this.clocks--;
          }
          break;

        default:
          debugstr+="Unknown branch 0x"+this.ci.toString(16);
          this.running=false;
          return;
          break;
      }
      debug(debugstr+"="+((this.ci&0x20)>>5)+" then branch "+this.addr);
    }
    else
    if (this.ci==0x00) // * Simulate interrupt request IRQ
    {
      debug("BRK"); // B
      this.SETFLAG(BFLAG);

      // Save program counter and status register
      this.pushword(this.pc);
      this.push(this.flags);

      // Jump to loction stored at &FFFE
      this.pc=this.mem[0xfffe]|(this.mem[0xffff]<<8);

      this.running=false;
      return;
    }
    else
    if (this.ci==0x20) // * Jump to subroutine
    {
      debug("JSR abs 0x"+src.toString(16));
      this.addr=src;
      if (this.addr>=0x8000)
      {
        debug(" ");
        this.OSJump(this.addr);
      }
      else
      {
        this.pushword(this.pc-1);
        this.pc=this.addr;
      }
    }
    else
    if (this.ci==0x40) // * Return from interrupt
    {
      debug("RTI"); // ALL
      this.flags=this.pop();
      this.pc=this.popword();
    }
    else
    if (this.ci==0x60) // * Return from subroutine
    {
      debug("RTS");
      this.pc=this.popword()+1;
    }
    else
    if ((this.ci==0x80) || // * Uncaught illegal instructions
        (this.ci==0x89) ||
        (this.ci==0x9e) ||
        (((this.ci&0x0f)==0x02) && (this.ci!=0xa2)) ||
        (((this.ci&0x0f)==0x0c) && ((this.ci&0x10)!=0) && (this.ci!=0xbc)) ||
        (((this.ci&0x0f)==0x04) && ((this.ci>>4)<0x8) && (this.ci!=0x24)) ||
        (((this.ci&0x0f)==0x04) && ((this.ci>>4)>0xc) && ((this.ci&0x10)!=0)))
    {
      debug("Illegal opcode 0x"+this.ci.toString(16));
      this.running=false;
    }
    else
    {
      var result;

      // Process instructions from standard opcode tables
      switch (this.cc)
      {
        case 0x00:
          // Process instruction
          switch (this.aaa)
          {
            case 0x01: // * Test bits in A with M
              debug("BIT"); // N V Z
              result=this.mem[AREG] & this.mem[src];
              if ((result&0x40)!=0x00) this.SETFLAG(VFLAG); else this.CLEARFLAG(VFLAG);
              this.update_flagsZN(result);
              break;

            case 0x02: // * Goto address absolute
              debug("JMP abs 0x"+src.toString(16));
              this.addr=src;
              if (this.addr>=0x8000)
              {
                this.OSJump(this.addr);

                this.pc=this.popword()+1; // The OS will RTS eventually
              }
              else
                this.pc=this.addr;
              break;

            case 0x03: // * Goto address indirect
              debug("JMP ind (0x"+src.toString(16)+")");
              this.addr=src;
              if (this.addr>=0x8000)
              {
                this.OSJump(this.addr);

                this.pc=this.popword()+1; // The OS will RTS eventually
              }
              else
                this.pc=this.addr;
              break;

            case 0x04: // * Store Y in memory
              debug("STY");
              this.mem[src]=this.mem[YREG];
              break;

            case 0x05: // * Load Y with memory
              debug("LDY"); // N Z
              this.mem[YREG]=this.mem[src];
              this.update_flagsZN(this.mem[YREG]);
              break;

            case 0x06: // * Compare Y with memory
              debug("CPY"); // N Z C
              result=this.mem[YREG]-this.mem[src];
              if (this.mem[YREG]>=this.mem[src]) this.SETFLAG(CFLAG); else this.CLEARFLAG(CFLAG);
              this.update_flagsZN(result);
              break;

            case 0x07: // * Compare X with memory
              debug("CPX"); // N Z C
              result=this.mem[XREG]-this.mem[src];
              if (this.mem[XREG]>=this.mem[src]) this.SETFLAG(CFLAG); else this.CLEARFLAG(CFLAG);
              this.update_flagsZN(result);
              break;

            default:
              debug("Unknown opcode "+this.ci.toString(16)+" in table "+this.cc.toString(16));
              this.running=false;
              return;
              break;
          }
          break;

        case 0x01: // Most common instructions
          // Process instruction
          switch (this.aaa)
          {
            case 0x00: // * Bitwise-OR A with memory
              debug("ORA"); // N Z
              this.mem[AREG]|=this.mem[src];
              this.update_flagsZN(this.mem[AREG]);
              break;

            case 0x01: // * Bitwise-AND A with memory
              debug("AND"); // N Z
              this.mem[AREG]&=this.mem[src];
              this.update_flagsZN(this.mem[AREG]);
              break;

            case 0x02: // * Bitwise-XOR A with memory
              debug("EOR"); // N Z
              this.mem[AREG]^=this.mem[src];
              this.update_flagsZN(this.mem[AREG]);
              break;

            case 0x03: // * Add memory to A with carry
              debug("ADC"); // N V Z C
              result=this.mem[AREG]+this.mem[src]+(this.flags&CFLAG);

              // Determine if overflow has occurred
              if ((this.mem[AREG]&0x80)!=(result&0x80))
                this.SETFLAG(VFLAG);
              else
                this.CLEARFLAG(VFLAG);

              // Determine if result is negative
              if ((this.mem[AREG]&0x80)==0x00)
                this.CLEARFLAG(NFLAG);
              else
                this.SETFLAG(NFLAG);

              // Determine if result is zero
              if (result==0x00)
                this.SETFLAG(ZFLAG);
              else
                this.CLEARFLAG(ZFLAG);

              // Deterime if carry needed
              if ((this.flags&DFLAG)==0x00)
              {
                // Set carry flag
                if (result>255)
                  this.SETFLAG(CFLAG);
                else
                  this.CLEARFLAG(CFLAG);
              }
              else
              {
                result=this.bcd(this.mem[AREG])+this.bcd(this.mem[src])+(this.flags&CFLAG);

                if (result>99)
                  this.SETFLAG(CFLAG);
                else
                  this.CLEARFLAG(CFLAG);
              }

              this.mem[AREG]=result&0xff;
              break;

            case 0x04: // * Store A in memory
              debug("STA");
              this.mem[src]=this.mem[AREG];
              break;

            case 0x05: // * Load A with memory
              debug("LDA"); // N Z
              this.mem[AREG]=this.mem[src];
              this.update_flagsZN(this.mem[AREG]);
              break;

            case 0x06: // * Compare A with memory
              debug("CMP"); // N Z C
              result=this.mem[AREG]-this.mem[src];

              // Determine carry
              if (this.mem[AREG]>=this.mem[src])
                this.SETFLAG(CFLAG);
              else
                this.CLEARFLAG(CFLAG);

              this.update_flagsZN(result);
              break;

            case 0x07: // * Subtract memory from A with borrow
              debug("SBC"); // N V Z C
              if ((this.flags&DFLAG)==0x00)
              {
                result=this.mem[AREG]-this.mem[src]-(1-(this.flags&CFLAG));
                if ((result>127) || (result<-128))
                  this.SETFLAG(VFLAG);
                else
                  this.CLEARFLAG(VFLAG);
              }
              else
              {
                result=this.bcd(this.mem[AREG])-this.bcd(this.mem[src])-(1-(this.flags&CFLAG));
                if ((result>99) || (result<0))
                  this.SETFLAG(VFLAG);
                else
                  this.CLEARFLAG(VFLAG);
              }

              if (result>=0)
                this.SETFLAG(CFLAG);
              else
                this.CLEARFLAG(CFLAG);

              this.mem[AREG]=result&0xff;

              this.update_flagsZN(this.mem[AREG]);
              break;

            default:
              debug("Unknown opcode "+this.ci.toString(16)+" in table "+this.cc.toString(16));
              this.running=false;
              return;
              break;
          }
          break;

        case 0x02:
          // Process instruction
          switch (this.aaa)
          {
            case 0x00: // * Arithmetic shift left
              debug("ASL"); // N Z C

              // Place top bit in carry flag
              if ((this.mem[src]&0x80)==0x00)
                this.CLEARFLAG(CFLAG);
              else
                this.SETFLAG(CFLAG);

              // Shift left (i.e. *2), then clear bottom bit
              this.mem[src]=(this.mem[src] << 1)&0xfe;

              this.update_flagsZN(this.mem[src]);
              break;

            case 0x01: // * Rotate left
              debug("ROL"); // N Z C
              result=this.mem[src];
              this.mem[src]=(((this.mem[src] << 1)&0xfe) + (this.flags&CFLAG));

              if ((result&0x80)==0x00)
                this.CLEARFLAG(CFLAG);
              else
                this.SETFLAG(CFLAG);

              this.update_flagsZN(this.mem[src]);
              break;

            case 0x02: // * Logical shift right
              debug("LSR"); // N Z C
              this.CLEARFLAG(NFLAG);

              // Place bottom bit in carry
              if ((this.mem[src]&0x01)==0x00)
                this.CLEARFLAG(CFLAG);
              else
                this.SETFLAG(CFLAG);

              // Divide by 2
              this.mem[src]=((this.mem[src]>>1)&0x7f);

              if (this.mem[src]==0x00) this.SETFLAG(ZFLAG); else this.CLEARFLAG(ZFLAG);
              break;

            case 0x03: // * Rotate right
              debug("ROR"); // N Z C
              result=this.mem[src]&0x01;
              this.mem[src]=((this.mem[src]>>1)&0x7f);

              if ((this.flags&CFLAG)!=0x00)
                this.mem[src]|=0x80;

              this.flags|=result;

              this.update_flagsZN(this.mem[src]);
              break;

            case 0x04: // * Store X in memory
              debug("STX");
              this.mem[src]=this.mem[XREG];
              break;

            case 0x05: // * Load X with memory
              debug("LDX"); // N Z
              this.mem[XREG]=this.mem[src];
              this.update_flagsZN(this.mem[XREG]);
              break;

            case 0x06: // * Decrement indexed memory by 1 (DEX/DEY)
              debug("DEC"); // N Z
              this.mem[src]--;
              this.update_flagsZN(this.mem[src]);
              break;

            case 0x07: // * Increment memory by 1
              debug("INC"); // N Z
              this.mem[src]++;
              this.update_flagsZN(this.mem[src]);
              break;

            default:
              debug("Unknown opcode "+this.ci.toString(16)+" in table "+this.cc.toString(16));
              this.running=false;
              return;
              break;
          }
          break;

        default:
          debug("Unknown opcode table 0x"+this.cc.toString(16)+" for instruction 0x"+this.ci.toString(16));
          this.running=false;
          return;
          break;
      }
    }
  },

};

// Request animation frame callback
function rafcallback(timestamp)
{
  // If this is not the first frame then process opcodes
  if (core.lasttime>0)
  {
    // Determine time since last call
    var delta=timestamp-core.lasttime;

    // Calculate the number of clock cycles we can execute (assuming 2 MHz)
    core.clocks=Math.floor(delta*1000*2);

    while ((core.running) && (core.clocks>0))
      core.stepcore();
  }

  // Remember when we were last called
  core.lasttime=timestamp;

  // Request we are called on the next frame, but only if still running
  if (core.running)
    window.requestAnimationFrame(rafcallback);
}

function launchcore()
{
  var lp=0x2000;

  core.resetcore();

  // Load test code
  core.mem[lp++]=0xa9; // LDA #0x16
  core.mem[lp++]=0x16; //

  core.mem[lp++]=0x20; // JSR 0xFFEE
  core.mem[lp++]=0xee; //
  core.mem[lp++]=0xff; //

  core.mem[lp++]=0xa9; // LDA #0x07
  core.mem[lp++]=0x07; //

  core.mem[lp++]=0x20; // JSR 0xFFEE
  core.mem[lp++]=0xee; //
  core.mem[lp++]=0xff; //

  core.mem[lp++]=0xa9; // LDA #0x1F
  core.mem[lp++]=0x1f; //

  core.mem[lp++]=0x85; // STA 0x70
  core.mem[lp++]=0x70; //

  core.mem[lp++]=0xa9; // LDA #0x20
  core.mem[lp++]=0x20; //

  core.mem[lp++]=0x85; // STA 0x71
  core.mem[lp++]=0x71; //

  core.mem[lp++]=0xa0; // LDY 0x00
  core.mem[lp++]=0x00; //

  core.mem[lp++]=0xb1; // LDA (0x70),Y
  core.mem[lp++]=0x70; //

  core.mem[lp++]=0xf0; // BEQ 0x06
  core.mem[lp++]=0x06; //

  core.mem[lp++]=0x20; // JSR 0xFFE3
  core.mem[lp++]=0xe3; //
  core.mem[lp++]=0xff; //

  core.mem[lp++]=0xc8; // INY

  core.mem[lp++]=0xd0; // BNE 0xF6 (-10)
  core.mem[lp++]=0xf6; //

  core.mem[lp++]=0x60; // RTS

  core.mem[lp++]=0x48; // H
  core.mem[lp++]=0x65; // e
  core.mem[lp++]=0x6c; // l
  core.mem[lp++]=0x6c; // l
  core.mem[lp++]=0x6f; // o
  core.mem[lp++]=0x20; // " "
  core.mem[lp++]=0x36; // 6
  core.mem[lp++]=0x35; // 5
  core.mem[lp++]=0x30; // 0
  core.mem[lp++]=0x32; // 2
  core.mem[lp++]=0x20; // " "
  core.mem[lp++]=0x77; // w
  core.mem[lp++]=0x6f; // o
  core.mem[lp++]=0x72; // r
  core.mem[lp++]=0x6c; // l
  core.mem[lp++]=0x64; // d
  core.mem[lp++]=0x21; // !
  core.mem[lp++]=0x0d; // CR
  core.mem[lp++]=0x00; // NULL

  core.pc=0x2000;
  core.running=true;
  window.requestAnimationFrame(rafcallback);
}

launchcore();
